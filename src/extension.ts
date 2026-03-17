import * as vscode from 'vscode';
import { parseMarkdown, SpeechBlock } from './markdownParser';
import { normalizeSpeechBlock, stripMarkdownFormatting } from './speechNormalizer';
import { createSpeechEngine, SpeechEngine } from './speechEngine';
import { PlaybackSession, PlaybackState } from './playbackSession';
import { PlaybackFilter, ListeningMode, getFilterForMode, shouldReadBlock } from './filters';
import { HighlightManager } from './highlighting';
import { registerCodeLensProvider, HeadingCodeLensProvider } from './codeLens';
import { StatusBarManager } from './statusBar';

let session: PlaybackSession | undefined;
let statusBar: StatusBarManager;
let highlightManager: HighlightManager;
let codeLensProvider: HeadingCodeLensProvider;
let engine: SpeechEngine;
let currentListeningMode: ListeningMode = 'prose-only';
let currentFilter: PlaybackFilter = getFilterForMode('prose-only');

function getConfig() {
    const config = vscode.workspace.getConfiguration('speech');
    return {
        voice: config.get<string>('voice'),
        speed: config.get<number>('speed') ?? 1.0,
        listeningMode: config.get<string>('listeningMode') as ListeningMode ?? 'prose-only',
        highlightEnabled: config.get<boolean>('highlightCurrentSentence') ?? true,
        codeLensEnabled: config.get<boolean>('codeLensEnabled') ?? true,
        readCodeBlocks: config.get<boolean>('readCodeBlocks') ?? false,
        readTables: config.get<boolean>('readTables') ?? false,
        readInlineCode: config.get<boolean>('readInlineCode') ?? false,
    };
}

function isMarkdownEditor(editor: vscode.TextEditor | undefined): boolean {
    return editor?.document.languageId === 'markdown';
}

function updateStatusBarVisibility(): void {
    const editor = vscode.window.activeTextEditor;
    if (isMarkdownEditor(editor) || session?.state === 'playing' || session?.state === 'paused') {
        statusBar.show();
    } else {
        statusBar.hide();
    }
}

function stopCurrentSession(): void {
    if (session) {
        session.stop();
        session = undefined;
    }
    highlightManager.clear();
    statusBar.update('idle', getConfig().speed);
}

function startPlayback(editor: vscode.TextEditor, fromLine?: number): void {
    stopCurrentSession();

    const text = editor.document.getText();
    const blocks = parseMarkdown(text);

    if (blocks.length === 0) {
        return;
    }

    const config = getConfig();
    const filter = { ...currentFilter };
    let startIndex = 0;

    if (fromLine !== undefined) {
        const idx = blocks.findIndex(b => b.startLine >= fromLine);
        if (idx >= 0) {
            startIndex = idx;
        }
    }

    session = new PlaybackSession({
        blocks,
        startBlockIndex: startIndex,
        filter,
        speed: config.speed,
        voice: config.voice,
        onBlockStart: (block: SpeechBlock) => {
            if (config.highlightEnabled) {
                highlightManager.highlight(editor, block.startLine, block.endLine);
            }
            statusBar.update('playing', config.speed);
        },
        onBlockEnd: () => {
            // Block ended, highlight will move to next
        },
        onStateChange: (state: PlaybackState) => {
            statusBar.update(state, config.speed);
            if (state === 'stopped' || state === 'idle') {
                highlightManager.clear();
            }
        },
        onComplete: () => {
            highlightManager.clear();
            statusBar.update('idle', config.speed);
            session = undefined;
        },
    }, engine);

    session.play();
}

function startSelectionPlayback(editor: vscode.TextEditor): void {
    stopCurrentSession();

    const selection = editor.selection;
    if (selection.isEmpty) {
        return;
    }

    const text = editor.document.getText(selection);
    const config = getConfig();

    if (editor.document.languageId === 'markdown') {
        const blocks = parseMarkdown(text);
        if (blocks.length === 0) {
            return;
        }

        // Adjust block line numbers relative to selection start
        const offset = selection.start.line;
        for (const block of blocks) {
            block.startLine += offset;
            block.endLine += offset;
        }

        session = new PlaybackSession({
            blocks,
            filter: currentFilter,
            speed: config.speed,
            voice: config.voice,
            onBlockStart: (block: SpeechBlock) => {
                if (config.highlightEnabled) {
                    highlightManager.highlight(editor, block.startLine, block.endLine);
                }
                statusBar.update('playing', config.speed);
            },
            onStateChange: (state: PlaybackState) => {
                statusBar.update(state, config.speed);
                if (state === 'stopped' || state === 'idle') {
                    highlightManager.clear();
                }
            },
            onComplete: () => {
                highlightManager.clear();
                statusBar.update('idle', config.speed);
                session = undefined;
            },
        }, engine);

        session.play();
    } else {
        // For non-Markdown files, speak raw text
        engine.speak(stripMarkdownFormatting(text), {
            voice: config.voice,
            speed: config.speed,
        });
    }
}

async function pickListeningMode(): Promise<void> {
    const items: vscode.QuickPickItem[] = [
        { label: 'Prose Only', description: 'Headings, paragraphs, lists, blockquotes', detail: currentListeningMode === 'prose-only' ? '$(check) Current' : undefined },
        { label: 'Prose + Examples', description: 'Prose plus code blocks', detail: currentListeningMode === 'prose-examples' ? '$(check) Current' : undefined },
        { label: 'Full Document', description: 'Read everything', detail: currentListeningMode === 'full' ? '$(check) Current' : undefined },
        { label: 'Custom', description: 'Choose content types', detail: currentListeningMode === 'custom' ? '$(check) Current' : undefined },
    ];

    const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select listening mode',
    });

    if (!pick) {
        return;
    }

    switch (pick.label) {
        case 'Prose Only':
            currentListeningMode = 'prose-only';
            break;
        case 'Prose + Examples':
            currentListeningMode = 'prose-examples';
            break;
        case 'Full Document':
            currentListeningMode = 'full';
            break;
        case 'Custom':
            currentListeningMode = 'custom';
            break;
    }

    currentFilter = getFilterForMode(currentListeningMode);
}

async function pickSpeed(): Promise<void> {
    const speeds = ['0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'];
    const config = getConfig();
    const items = speeds.map(s => ({
        label: `${s}x`,
        description: parseFloat(s) === config.speed ? '$(check) Current' : undefined,
    }));

    const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select playback speed',
    });

    if (pick) {
        const speed = parseFloat(pick.label);
        await vscode.workspace.getConfiguration('speech').update('speed', speed, true);
        if (session) {
            session.setSpeed(speed);
        }
        statusBar.update(session?.state ?? 'idle', speed);
    }
}

function findNextHeadingLine(editor: vscode.TextEditor, fromLine: number, direction: 1 | -1): number | undefined {
    const doc = editor.document;
    const headingRegex = /^#{1,6}\s+/;
    let line = fromLine + direction;

    while (line >= 0 && line < doc.lineCount) {
        if (headingRegex.test(doc.lineAt(line).text)) {
            return line;
        }
        line += direction;
    }
    return undefined;
}

export function activate(context: vscode.ExtensionContext) {
    engine = createSpeechEngine();
    statusBar = new StatusBarManager();
    highlightManager = new HighlightManager();

    const config = getConfig();
    currentListeningMode = config.listeningMode;
    currentFilter = getFilterForMode(currentListeningMode);

    // Apply custom filter overrides from settings
    if (currentListeningMode !== 'custom') {
        currentFilter.readCodeBlocks = config.readCodeBlocks;
        currentFilter.readTables = config.readTables;
        currentFilter.readInlineCode = config.readInlineCode;
    }

    // Register CodeLens provider
    if (config.codeLensEnabled) {
        codeLensProvider = registerCodeLensProvider(context);
    }

    // Status bar visibility
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => updateStatusBarVisibility())
    );
    updateStatusBarVisibility();

    // Stop playback when document closes
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(() => {
            if (session) {
                const editor = vscode.window.activeTextEditor;
                if (!editor || !isMarkdownEditor(editor)) {
                    stopCurrentSession();
                }
            }
        })
    );

    // Read from cursor
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('speech.readFromCursor', (editor, _edit, lineArg?: number) => {
            if (!isMarkdownEditor(editor)) {
                return;
            }
            const fromLine = typeof lineArg === 'number' ? lineArg : editor.selection.active.line;
            startPlayback(editor, fromLine);
        })
    );

    // Read selection
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('speech.readSelection', (editor) => {
            startSelectionPlayback(editor);
        })
    );

    // Speak document (legacy + new)
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('speech.speakDocument', (editor) => {
            if (isMarkdownEditor(editor)) {
                startPlayback(editor, 0);
            } else {
                // Legacy behavior: speak raw text for non-Markdown files
                stopCurrentSession();
                const text = stripMarkdownFormatting(editor.document.getText());
                if (text) {
                    engine.speak(text, { voice: config.voice, speed: config.speed });
                }
            }
        })
    );

    // Speak selection (legacy)
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('speech.speakSelection', (editor) => {
            startSelectionPlayback(editor);
        })
    );

    // Toggle playback (play/pause/resume)
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.togglePlayback', () => {
            if (session?.state === 'playing') {
                session.pause();
            } else if (session?.state === 'paused') {
                session.resume();
            } else {
                const editor = vscode.window.activeTextEditor;
                if (editor && isMarkdownEditor(editor)) {
                    startPlayback(editor, editor.selection.active.line);
                }
            }
        })
    );

    // Stop speaking
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.stopSpeaking', () => {
            stopCurrentSession();
        })
    );

    // Increase speed
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.increaseSpeed', async () => {
            const config = getConfig();
            const newSpeed = Math.min(config.speed + 0.25, 3.0);
            await vscode.workspace.getConfiguration('speech').update('speed', newSpeed, true);
            if (session) {
                session.setSpeed(newSpeed);
            }
            statusBar.update(session?.state ?? 'idle', newSpeed);
        })
    );

    // Decrease speed
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.decreaseSpeed', async () => {
            const config = getConfig();
            const newSpeed = Math.max(config.speed - 0.25, 0.25);
            await vscode.workspace.getConfiguration('speech').update('speed', newSpeed, true);
            if (session) {
                session.setSpeed(newSpeed);
            }
            statusBar.update(session?.state ?? 'idle', newSpeed);
        })
    );

    // Next section
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('speech.nextSection', (editor) => {
            if (!isMarkdownEditor(editor)) {
                return;
            }
            const line = findNextHeadingLine(editor, editor.selection.active.line, 1);
            if (line !== undefined) {
                editor.selection = new vscode.Selection(line, 0, line, 0);
                editor.revealRange(new vscode.Range(line, 0, line, 0));
                if (session?.state === 'playing' || session?.state === 'paused') {
                    startPlayback(editor, line);
                }
            }
        })
    );

    // Previous section
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('speech.previousSection', (editor) => {
            if (!isMarkdownEditor(editor)) {
                return;
            }
            const line = findNextHeadingLine(editor, editor.selection.active.line, -1);
            if (line !== undefined) {
                editor.selection = new vscode.Selection(line, 0, line, 0);
                editor.revealRange(new vscode.Range(line, 0, line, 0));
                if (session?.state === 'playing' || session?.state === 'paused') {
                    startPlayback(editor, line);
                }
            }
        })
    );

    // Listening mode picker
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.pickListeningMode', () => {
            pickListeningMode();
        })
    );

    // Speed picker
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.pickSpeed', () => {
            pickSpeed();
        })
    );

    // Toggle code blocks
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.toggleCodeBlocks', () => {
            currentFilter.readCodeBlocks = !currentFilter.readCodeBlocks;
            vscode.window.showInformationMessage(
                `Code blocks: ${currentFilter.readCodeBlocks ? 'reading' : 'skipping'}`
            );
        })
    );

    // Toggle tables
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.toggleTables', () => {
            currentFilter.readTables = !currentFilter.readTables;
            vscode.window.showInformationMessage(
                `Tables: ${currentFilter.readTables ? 'reading' : 'skipping'}`
            );
        })
    );

    // Toggle inline code
    context.subscriptions.push(
        vscode.commands.registerCommand('speech.toggleInlineCode', () => {
            currentFilter.readInlineCode = !currentFilter.readInlineCode;
            vscode.window.showInformationMessage(
                `Inline code: ${currentFilter.readInlineCode ? 'reading' : 'skipping'}`
            );
        })
    );

    // Diff support: Read left side
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('speech.readDiffLeft', (editor) => {
            // In diff view, the original (left) file is available in the active editor
            if (isMarkdownEditor(editor)) {
                startPlayback(editor, 0);
            }
        })
    );

    // Diff support: Read right side
    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('speech.readDiffRight', (editor) => {
            if (isMarkdownEditor(editor)) {
                startPlayback(editor, 0);
            }
        })
    );

    // Disposables
    context.subscriptions.push(statusBar);
    context.subscriptions.push(highlightManager);
}

export function deactivate() {
    stopCurrentSession();
}
