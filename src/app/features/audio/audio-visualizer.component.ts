import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-audio-visualizer',
  standalone: true,
  imports: [NgFor],
  template: `
    <section class="panel">
      <header>
        <h2>Signal response</h2>
        <p class="muted">Reactive waveform</p>
      </header>
      <div class="waveform">
        <div class="line" *ngFor="let bar of bars"></div>
      </div>
      <div class="indicators">
        <span>Ambient pulse</span>
        <span class="muted">No recording</span>
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
export class AudioVisualizerComponent {
  bars = Array.from({ length: 18 });
}
