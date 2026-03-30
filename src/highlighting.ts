import * as vscode from 'vscode';

export class HighlightManager {
    private _decorationType: vscode.TextEditorDecorationType;
    private _activeEditor: vscode.TextEditor | undefined;

    constructor() {
        this._decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            isWholeLine: true,
        });
    }

    highlight(editor: vscode.TextEditor, startLine: number, endLine: number): void {
        this._activeEditor = editor;
        const endChar = editor.document.lineAt(endLine).text.length;
        const range = new vscode.Range(startLine, 0, endLine, endChar);
        editor.setDecorations(this._decorationType, [range]);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    clear(): void {
        if (this._activeEditor) {
            this._activeEditor.setDecorations(this._decorationType, []);
            this._activeEditor = undefined;
        }
    }

    dispose(): void {
        this.clear();
        this._decorationType.dispose();
    }
}
