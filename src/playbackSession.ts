import { SpeechBlock } from './markdownParser';
import { normalizeSpeechBlock } from './speechNormalizer';
import { SpeechEngine, createSpeechEngine } from './speechEngine';
import { PlaybackFilter, shouldReadBlock } from './filters';

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

export interface PlaybackSessionOptions {
    blocks: SpeechBlock[];
    startBlockIndex?: number;
    filter: PlaybackFilter;
    speed: number;
    voice?: string;
    onBlockStart?: (block: SpeechBlock, index: number) => void;
    onBlockEnd?: (block: SpeechBlock, index: number) => void;
    onStateChange?: (state: PlaybackState) => void;
    onComplete?: () => void;
}

export class PlaybackSession {
    private _state: PlaybackState = 'idle';
    private _currentBlockIndex: number;
    private _speed: number;
    private _voice: string | undefined;
    private _blocks: SpeechBlock[];
    private _filter: PlaybackFilter;
    private _engine: SpeechEngine;
    private _cancelled = false;

    private _onBlockStart?: (block: SpeechBlock, index: number) => void;
    private _onBlockEnd?: (block: SpeechBlock, index: number) => void;
    private _onStateChange?: (state: PlaybackState) => void;
    private _onComplete?: () => void;

    constructor(options: PlaybackSessionOptions, engine?: SpeechEngine) {
        this._blocks = options.blocks;
        this._currentBlockIndex = options.startBlockIndex ?? 0;
        this._filter = options.filter;
        this._speed = options.speed;
        this._voice = options.voice;
        this._engine = engine ?? createSpeechEngine();
        this._onBlockStart = options.onBlockStart;
        this._onBlockEnd = options.onBlockEnd;
        this._onStateChange = options.onStateChange;
        this._onComplete = options.onComplete;
    }

    get state(): PlaybackState {
        return this._state;
    }

    get currentBlockIndex(): number {
        return this._currentBlockIndex;
    }

    get currentBlock(): SpeechBlock | undefined {
        return this._blocks[this._currentBlockIndex];
    }

    get speed(): number {
        return this._speed;
    }

    setSpeed(speed: number): void {
        this._speed = speed;
    }

    async play(): Promise<void> {
        if (this._state === 'playing') {
            return;
        }
        this._cancelled = false;
        this.setState('playing');

        while (this._currentBlockIndex < this._blocks.length && !this._cancelled) {
            const block = this._blocks[this._currentBlockIndex];

            if (!shouldReadBlock(block, this._filter)) {
                this._currentBlockIndex++;
                continue;
            }

            const text = normalizeSpeechBlock(block);
            if (!text) {
                this._currentBlockIndex++;
                continue;
            }

            this._onBlockStart?.(block, this._currentBlockIndex);

            try {
                await this._engine.speak(text, {
                    voice: this._voice,
                    speed: this._speed,
                });
            } catch {
                // Speech was interrupted (e.g., by stop/pause), exit loop
                if (this._cancelled) {
                    break;
                }
            }

            if (this._cancelled) {
                break;
            }

            this._onBlockEnd?.(block, this._currentBlockIndex);
            this._currentBlockIndex++;
        }

        if (!this._cancelled) {
            this.setState('idle');
            this._onComplete?.();
        }
    }

    pause(): void {
        if (this._state !== 'playing') {
            return;
        }
        this._cancelled = true;
        this._engine.stop();
        this.setState('paused');
    }

    resume(): void {
        if (this._state !== 'paused') {
            return;
        }
        this.play();
    }

    stop(): void {
        this._cancelled = true;
        this._engine.stop();
        this.setState('stopped');
    }

    private setState(state: PlaybackState): void {
        this._state = state;
        this._onStateChange?.(state);
    }
}
