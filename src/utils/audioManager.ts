export class AudioManager {
    private static context: AudioContext | null = null;
    private static buffers: Map<string, AudioBuffer> = new Map();

    private static getContext(): AudioContext {
        if (!this.context) {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.context;
    }

    static async load(url: string): Promise<void> {
        try {
            const context = this.getContext();

            // Return if already loaded
            if (this.buffers.has(url)) return;

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await context.decodeAudioData(arrayBuffer);
            this.buffers.set(url, audioBuffer);
        } catch (error) {
            console.error(`Failed to load audio: ${url}`, error);
        }
    }

    static play(url: string, volume: number = 1.0): void {
        const context = this.getContext();
        const buffer = this.buffers.get(url);

        if (!buffer) {
            // Try to load and play if not ready (async, might slide)
            this.load(url).then(() => {
                // Optional: decide if we play late. For UI clicks, usually skip if too late, 
                // but for "load on mount" logic, this fallback is okay.
            });
            return;
        }

        // Ensure context is running (required for iOS after user gesture)
        if (context.state === 'suspended') {
            context.resume();
        }

        const source = context.createBufferSource();
        source.buffer = buffer;

        const gainNode = context.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(context.destination);

        source.start(0);
    }
}
