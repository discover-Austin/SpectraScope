import { Component, OnDestroy, effect, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { AudioSignalService } from '../../core/services/audio-signal.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-audio-visualizer',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <section class="panel">
      <header>
        <h2>Signal response</h2>
        <p class="muted">Reactive waveform</p>
      </header>
      <div class="waveform">
        <div
          class="line"
          *ngFor="let bar of bars; let i = index"
          [style.height.%]="barHeights[i]"
        ></div>
      </div>
      <div class="indicators">
        <span>Ambient pulse</span>
        <span class="muted" *ngIf="signal.state().active">Live amplitude</span>
        <span class="muted" *ngIf="!signal.state().active && permissions.granted()">
          No recording
        </span>
        <span class="muted" *ngIf="!permissions.granted()">Microphone permission required.</span>
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        background: var(--panel);
        border-radius: 20px;
        padding: 1.5rem;
        display: grid;
        gap: 1rem;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .waveform {
        display: grid;
        grid-auto-flow: column;
        gap: 6px;
        height: 140px;
        align-items: end;
      }

      .line {
        width: 8px;
        border-radius: 6px;
        background: linear-gradient(180deg, rgba(106, 208, 255, 0.8), rgba(106, 208, 255, 0.2));
        height: calc(30% + (var(--rand, 0.6) * 70%));
        animation: pulse 2.5s ease-in-out infinite;
      }

      .line:nth-child(odd) {
        animation-delay: 0.4s;
      }

      .indicators {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
      }

      .muted {
        color: var(--muted);
      }

      @keyframes pulse {
        0%,
        100% {
          transform: scaleY(0.7);
        }
        50% {
          transform: scaleY(1.1);
        }
      }
    `
  ]
})
export class AudioVisualizerComponent implements OnDestroy {
  readonly signal = inject(AudioSignalService);
  readonly permissions = inject(PermissionService);
  readonly bars = Array.from({ length: 18 });
  barHeights: number[] = new Array(18).fill(40);

  private rafId: number | null = null;
  private audioTransition: Promise<void> = Promise.resolve();
  private readonly pauseHandler = (): void => { this.signal.stop(); };
  private readonly resumeHandler = (): void => {
    if (this.permissions.granted()) {
      this.audioTransition = this.audioTransition.then(() => this.signal.start());
    }
  };

  constructor() {
    effect(() => {
      if (this.permissions.granted()) {
        this.audioTransition = this.audioTransition.then(() => this.signal.start());
      } else {
        this.signal.stop();
      }
    });
    this.animate();
    document.addEventListener('pause', this.pauseHandler);
    document.addEventListener('resume', this.resumeHandler);
  }

  ngOnDestroy(): void {
    this.signal.stop();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    document.removeEventListener('pause', this.pauseHandler);
    document.removeEventListener('resume', this.resumeHandler);
  }

  private animate(): void {
    const amplitude = this.signal.state().amplitude;
    for (let i = 0; i < this.barHeights.length; i++) {
      const offset = 30 + i * 3;
      this.barHeights[i] = Math.max(15, Math.min(90, (amplitude * 120 + offset) % 90));
    }
    this.rafId = requestAnimationFrame(() => this.animate());
  }
}
