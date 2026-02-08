import { Component, OnDestroy, effect, inject } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { AudioSignalService } from '../../core/services/audio-signal.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-audio-visualizer',
  standalone: true,
  imports: [DecimalPipe, NgFor, NgIf],
  template: `
    <section class="panel">
      <header>
        <h2>Signal response</h2>
        <p class="muted">Reactive waveform</p>
      </header>
      <div class="waveform" [class.active]="signal.state().active">
        <div
          class="line"
          *ngFor="let bar of bars; let i = index"
          [style.height.%]="barHeights[i]"
          [class.spike]="barHeights[i] > 70"
        ></div>
      </div>
      <div class="indicators">
        <span class="label">Ambient pulse</span>
        <span class="amp" *ngIf="signal.state().active">
          {{ (signal.state().amplitude * 100) | number:'1.0-0' }}% amplitude
        </span>
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
        gap: 5px;
        height: 140px;
        align-items: end;
        background: radial-gradient(ellipse at bottom, rgba(80, 255, 150, 0.04), transparent 70%);
        border-radius: 12px;
        padding: 0.5rem;
      }

      .waveform.active {
        background: radial-gradient(ellipse at bottom, rgba(80, 255, 150, 0.08), transparent 70%);
      }

      .line {
        width: 7px;
        border-radius: 4px;
        background: linear-gradient(
          180deg,
          rgba(120, 255, 180, 0.9),
          rgba(60, 200, 140, 0.4),
          rgba(30, 100, 80, 0.1)
        );
        transition: height 0.08s ease-out;
        box-shadow: 0 0 4px rgba(100, 255, 160, 0.2);
      }

      .line.spike {
        background: linear-gradient(
          180deg,
          rgba(255, 200, 100, 0.95),
          rgba(255, 120, 60, 0.6),
          rgba(200, 60, 30, 0.2)
        );
        box-shadow: 0 0 8px rgba(255, 150, 50, 0.4);
      }

      .line:nth-child(odd) {
        animation: pulse 2.5s ease-in-out infinite;
      }

      .line:nth-child(even) {
        animation: pulse 2.5s ease-in-out infinite 0.4s;
      }

      .indicators {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
      }

      .label {
        font-family: monospace;
        color: rgba(120, 255, 180, 0.7);
        text-shadow: 0 0 4px rgba(100, 255, 150, 0.3);
      }

      .amp {
        font-family: monospace;
        color: rgba(120, 255, 180, 0.8);
        text-shadow: 0 0 6px rgba(100, 255, 150, 0.4);
        font-size: 0.8rem;
      }

      .muted {
        color: var(--muted);
      }

      @keyframes pulse {
        0%,
        100% {
          transform: scaleY(0.85);
        }
        50% {
          transform: scaleY(1.08);
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
