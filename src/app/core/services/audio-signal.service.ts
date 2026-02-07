import { Injectable, signal } from '@angular/core';

interface AudioState {
  amplitude: number;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class AudioSignalService {
  private readonly stateSignal = signal<AudioState>({ amplitude: 0, active: false });
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private mediaStream: MediaStream | null = null;

  readonly state = this.stateSignal.asReadonly();

  async start(): Promise<void> {
    if (this.stateSignal().active) {
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.stateSignal.set({ amplitude: 0, active: true });
      this.sample();
    } catch (error) {
      this.stateSignal.set({ amplitude: 0, active: false });
      console.error(error);
    }
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.stateSignal.set({ amplitude: 0, active: false });
  }

  private sample(): void {
    if (!this.analyser) {
      return;
    }
    const buffer = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buffer);
    const rms = Math.sqrt(
      buffer.reduce((acc, value) => {
        const normalized = (value - 128) / 128;
        return acc + normalized * normalized;
      }, 0) / buffer.length
    );
    this.stateSignal.set({ amplitude: rms, active: true });
    this.rafId = requestAnimationFrame(() => this.sample());
  }
}
