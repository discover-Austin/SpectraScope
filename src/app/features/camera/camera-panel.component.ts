import { Component } from '@angular/core';

@Component({
  selector: 'app-camera-panel',
  standalone: true,
  template: `
    <section class="panel">
      <header>
        <h2>Session camera</h2>
        <p class="status">Session Active</p>
      </header>
      <div class="viewport">
        <div class="overlay"></div>
        <div class="readout">
          <span>Infrared palette</span>
          <span>Visual Noise Level: 62%</span>
        </div>
      </div>
      <footer>
        <button type="button" class="secondary">Manual capture</button>
        <span class="muted">No automatic saving.</span>
      </footer>
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

      .status {
        color: var(--accent);
        font-size: 0.9rem;
      }

      .viewport {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        height: 220px;
        background: radial-gradient(circle at top, rgba(106, 208, 255, 0.2), transparent 60%),
          linear-gradient(140deg, rgba(5, 10, 20, 0.9), rgba(25, 35, 48, 0.9));
      }

      .overlay {
        position: absolute;
        inset: 0;
        background-image: repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.05) 2px,
            transparent 2px,
            transparent 4px
          ),
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.06), transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(106, 208, 255, 0.08), transparent 45%);
        mix-blend-mode: screen;
        opacity: 0.6;
      }

      .readout {
        position: absolute;
        bottom: 1rem;
        left: 1rem;
        right: 1rem;
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: var(--text);
      }

      footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .muted {
        color: var(--muted);
        font-size: 0.85rem;
      }
    `
  ]
})
export class CameraPanelComponent {}
