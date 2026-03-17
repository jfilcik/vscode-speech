import * as vscode from 'vscode';

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

export class HeadingCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.CodeLens[] {
        if (document.languageId !== 'markdown') {
            return [];
        }

        const lenses: vscode.CodeLens[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const match = HEADING_REGEX.exec(line.text);
            if (match) {
                const range = new vscode.Range(i, 0, i, line.text.length);
                lenses.push(new vscode.CodeLens(range, {
                    title: '▶ Read from here',
                    command: 'speech.readFromCursor',
                    arguments: [i],
                }));
            }
        }
        return lenses;
    }

    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    dispose(): void {
        this._onDidChangeCodeLenses.dispose();
    }
}

export function registerCodeLensProvider(context: vscode.ExtensionContext): HeadingCodeLensProvider {
    const provider = new HeadingCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'markdown', scheme: 'file' },
            provider
        )
    );
    context.subscriptions.push(provider);
    return provider;
}
