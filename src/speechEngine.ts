import * as say from 'say';

export interface SpeechEngineOptions {
    voice?: string;
    speed?: number;
}

export interface SpeechEngine {
    speak(text: string, options?: SpeechEngineOptions): Promise<void>;
    stop(): void;
    getVoices(): Promise<string[]>;
}

export class NativeSpeechEngine implements SpeechEngine {
    speak(text: string, options?: SpeechEngineOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const voice = options?.voice;
            const speed = options?.speed;
            say.speak(text, voice, speed, (err: string) => {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve();
                }
            });
        });
    }

    stop(): void {
        say.stop();
    }

    getVoices(): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            say.getInstalledVoices((result: string) => {
                if (result && typeof result === 'string') {
                    const voices = result
                        .split('\n')
                        .map(v => v.trim())
                        .filter(v => v.length > 0);
                    resolve(voices);
                } else {
                    resolve([]);
                }
            });
        });
    }
}

export function createSpeechEngine(): SpeechEngine {
    return new NativeSpeechEngine();
}
