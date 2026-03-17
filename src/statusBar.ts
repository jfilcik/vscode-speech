import * as vscode from 'vscode';
import { PlaybackState } from './playbackSession';

export class StatusBarManager {
    private _mainItem: vscode.StatusBarItem;
    private _speedItem: vscode.StatusBarItem;

    constructor() {
        this._mainItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this._mainItem.command = 'speech.togglePlayback';

        this._speedItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);

        this.update('idle', 1.0);
    }

    update(state: PlaybackState, speed: number): void {
        switch (state) {
            case 'idle':
            case 'stopped':
                this._mainItem.text = '$(unmute) Read';
                this._mainItem.tooltip = 'Start reading document aloud';
                break;
            case 'playing':
                this._mainItem.text = '$(debug-pause) Pause';
                this._mainItem.tooltip = 'Pause reading';
                break;
            case 'paused':
                this._mainItem.text = '$(play) Resume';
                this._mainItem.tooltip = 'Resume reading';
                break;
        }

        this._speedItem.text = `${speed.toFixed(1)}x`;
        this._speedItem.tooltip = 'Speech speed';
    }

    show(): void {
        this._mainItem.show();
        this._speedItem.show();
    }

    hide(): void {
        this._mainItem.hide();
        this._speedItem.hide();
    }

    dispose(): void {
        this._mainItem.dispose();
        this._speedItem.dispose();
    }
}
