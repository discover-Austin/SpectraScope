import { Component, OnDestroy, effect, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { CameraService } from '../../core/services/camera.service';
import { GalleryService } from '../../core/services/gallery.service';
import { MonetizationService } from '../../core/services/monetization.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-camera-panel',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <section class="panel">
      <header>
        <h2>Session camera</h2>
        <p class="status">Session Active</p>
      </header>
      <div class="viewport">
        <div id="camera-preview" class="camera-preview"></div>
        <div class="overlay"></div>
        <div class="readout">
          <span>Infrared palette</span>
          <span>Visual Noise Level: 62%</span>
        </div>
      </div>
      <div class="filters">
        <div>
          <h4>Core filters</h4>
          <div class="chip-row">
            <span class="chip">Low-light grain</span>
            <span class="chip">Infrared palette</span>
            <span class="chip">Frame distortion</span>
          </div>
        </div>
        <div>
          <h4>Advanced filters</h4>
          <div class="chip-row">
            <span class="chip locked" *ngFor="let filter of advancedFilters">
              {{ filter }}
              <span *ngIf="!monetization.isProOwned()">Pro</span>
            </span>
          </div>
          <p class="muted" *ngIf="!monetization.isProOwned()">
            Advanced filters unlock with SpectraScope Pro.
          </p>
        </div>
      </div>
      <footer>
        <button
          type="button"
          class="secondary"
          (click)="capture()"
          [disabled]="!permissions.granted()"
        >
          Manual capture
        </button>
        <span class="muted">No automatic saving.</span>
      </footer>
      <p class="muted" *ngIf="!permissions.granted()">Camera permission required.</p>
      <p class="muted" *ngIf="camera.state().error">{{ camera.state().error }}</p>
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

      .camera-preview {
        position: absolute;
        inset: 0;
        z-index: 0;
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

      .filters {
        display: grid;
        gap: 1rem;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .chip {
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        background: rgba(255, 255, 255, 0.08);
      }

      .chip.locked {
        opacity: 0.6;
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
export class CameraPanelComponent implements OnDestroy {
  readonly camera = inject(CameraService);
  readonly gallery = inject(GalleryService);
  readonly monetization = inject(MonetizationService);
  readonly permissions = inject(PermissionService);
  readonly advancedFilters = ['Thermal bloom', 'Spectral edge', 'Echo trace'];

  private readonly pauseHandler = (): void => { void this.camera.stopPreview(); };
  private readonly resumeHandler = (): void => {
    if (this.permissions.granted() && !this.camera.state().active) {
      void this.camera.startPreview('camera-preview');
    }
  };

  constructor() {
    effect(() => {
      if (this.permissions.granted()) {
        void this.camera.startPreview('camera-preview');
      } else {
        void this.camera.stopPreview();
      }
    });
    document.addEventListener('pause', this.pauseHandler);
    document.addEventListener('resume', this.resumeHandler);
  }

  ngOnDestroy(): void {
    void this.camera.stopPreview();
    document.removeEventListener('pause', this.pauseHandler);
    document.removeEventListener('resume', this.resumeHandler);
  }

  async capture(): Promise<void> {
    if (!this.permissions.granted()) {
      return;
    }
    const image = await this.camera.capture();
    if (image) {
      this.gallery.addItem(image);
    }
  }
}
