import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { CameraService } from '../../core/services/camera.service';
import { GalleryService } from '../../core/services/gallery.service';
import { MonetizationService } from '../../core/services/monetization.service';
import { PermissionService } from '../../core/services/permission.service';
import { SessionService } from '../../core/services/session.service';
import { AudioSignalService } from '../../core/services/audio-signal.service';

interface CameraFilter {
  id: string;
  label: string;
  pro: boolean;
}

@Component({
  selector: 'app-camera-panel',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <section class="panel">
      <header>
        <h2>Session camera</h2>
        <p class="status" *ngIf="session.state().isActive">Session Active</p>
        <p class="status idle" *ngIf="!session.state().isActive">Standby</p>
      </header>
      <div
        class="viewport"
        [class.filter-grain]="isFilterActive('grain')"
        [class.filter-infrared]="isFilterActive('infrared')"
        [class.filter-distortion]="isFilterActive('distortion')"
        [class.filter-thermal]="isFilterActive('thermal')"
        [class.filter-spectral]="isFilterActive('spectral')"
        [class.filter-echo]="isFilterActive('echo')"
        [style.--intensity]="session.state().intensity"
      >
        <div id="camera-preview" class="camera-preview"></div>
        <div class="overlay-scanlines"></div>
        <div class="overlay-vignette"></div>
        <div class="overlay-flicker" *ngIf="session.state().isActive"></div>
        <div class="overlay-ghost" *ngIf="session.state().isActive"></div>
        <div class="overlay-noise" *ngIf="session.state().isActive"></div>
        <div class="readout">
          <span>{{ activeFilterLabel() }}</span>
          <span>Noise: {{ noiseLevel }}%</span>
        </div>
      </div>
      <div class="filters">
        <div>
          <h4>Core filters</h4>
          <div class="chip-row">
            <button
              type="button"
              *ngFor="let f of coreFilters"
              class="chip"
              [class.active]="isFilterActive(f.id)"
              (click)="toggleFilter(f)"
            >{{ f.label }}</button>
          </div>
        </div>
        <div>
          <h4>Advanced filters</h4>
          <div class="chip-row">
            <button
              type="button"
              *ngFor="let f of advancedFilters"
              class="chip"
              [class.active]="isFilterActive(f.id)"
              [class.locked]="!monetization.isProOwned()"
              (click)="toggleFilter(f)"
            >
              {{ f.label }}
              <span class="pro-badge" *ngIf="!monetization.isProOwned()">Pro</span>
            </button>
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

      .status.idle {
        color: var(--muted);
      }

      /* === VIEWPORT === */
      .viewport {
        --intensity: 0.6;
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        height: 260px;
        background: radial-gradient(circle at top, rgba(20, 60, 40, 0.4), transparent 60%),
          linear-gradient(140deg, rgba(2, 6, 10, 0.95), rgba(10, 18, 24, 0.95));
      }

      .camera-preview {
        position: absolute;
        inset: 0;
        z-index: 0;
      }

      /* --- Scan lines --- */
      .overlay-scanlines {
        position: absolute;
        inset: 0;
        z-index: 2;
        background: repeating-linear-gradient(
          0deg,
          rgba(255, 255, 255, 0.03) 0px,
          rgba(255, 255, 255, 0.03) 1px,
          transparent 1px,
          transparent 3px
        );
        pointer-events: none;
      }

      /* --- Dark vignette --- */
      .overlay-vignette {
        position: absolute;
        inset: 0;
        z-index: 3;
        background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.7) 100%);
        pointer-events: none;
      }

      /* --- Flicker effect --- */
      .overlay-flicker {
        position: absolute;
        inset: 0;
        z-index: 4;
        background: rgba(0, 0, 0, 0);
        animation: flicker 4s ease-in-out infinite;
        pointer-events: none;
      }

      /* --- Ghostly moving orbs --- */
      .overlay-ghost {
        position: absolute;
        inset: 0;
        z-index: 5;
        background:
          radial-gradient(circle at 30% 50%, rgba(180, 255, 200, calc(0.12 * var(--intensity))), transparent 30%),
          radial-gradient(circle at 70% 30%, rgba(100, 200, 255, calc(0.08 * var(--intensity))), transparent 25%),
          radial-gradient(circle at 50% 80%, rgba(200, 180, 255, calc(0.06 * var(--intensity))), transparent 20%);
        mix-blend-mode: screen;
        animation: ghostDrift 8s ease-in-out infinite alternate;
        pointer-events: none;
      }

      /* --- Static noise grain --- */
      .overlay-noise {
        position: absolute;
        inset: -50%;
        width: 200%;
        height: 200%;
        z-index: 6;
        opacity: calc(0.15 * var(--intensity));
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
        background-size: 256px 256px;
        animation: noiseShift 0.15s steps(3) infinite;
        mix-blend-mode: overlay;
        pointer-events: none;
      }

      /* === FILTER CLASSES (applied to .viewport) === */

      /* Low-light grain: desaturate + boost contrast */
      .filter-grain {
        filter: saturate(0.4) contrast(1.4) brightness(0.8);
      }

      /* Infrared palette: green channel tint */
      .filter-infrared {
        filter: saturate(0) brightness(1.1) contrast(1.2);
      }
      .filter-infrared .camera-preview {
        filter: sepia(1) hue-rotate(80deg) saturate(2.5);
      }

      /* Frame distortion: slight skew + blur edges */
      .filter-distortion .camera-preview {
        animation: distort 3s ease-in-out infinite;
      }

      /* Thermal bloom (Pro): hot color map */
      .filter-thermal {
        filter: contrast(1.3);
      }
      .filter-thermal .camera-preview {
        filter: sepia(1) hue-rotate(-30deg) saturate(3) brightness(1.1);
      }
      .filter-thermal .overlay-ghost {
        background:
          radial-gradient(circle at 40% 40%, rgba(255, 80, 20, calc(0.2 * var(--intensity))), transparent 35%),
          radial-gradient(circle at 60% 60%, rgba(255, 200, 0, calc(0.15 * var(--intensity))), transparent 30%);
      }

      /* Spectral edge (Pro): high-contrast edge detect feel */
      .filter-spectral {
        filter: saturate(0.2) contrast(2.5) brightness(0.7);
      }
      .filter-spectral .camera-preview {
        filter: invert(0.85) contrast(2);
      }
      .filter-spectral .overlay-ghost {
        mix-blend-mode: difference;
      }

      /* Echo trace (Pro): trailing afterimage */
      .filter-echo .camera-preview {
        animation: echoTrail 2s ease-in-out infinite;
      }
      .filter-echo .overlay-ghost {
        background:
          radial-gradient(circle at 25% 40%, rgba(130, 100, 255, calc(0.18 * var(--intensity))), transparent 30%),
          radial-gradient(circle at 75% 60%, rgba(100, 180, 255, calc(0.12 * var(--intensity))), transparent 25%);
        animation: ghostDrift 5s ease-in-out infinite alternate-reverse;
      }

      /* === READOUT === */
      .readout {
        position: absolute;
        bottom: 0.75rem;
        left: 1rem;
        right: 1rem;
        z-index: 10;
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        font-family: monospace;
        color: rgba(180, 255, 200, 0.8);
        text-shadow: 0 0 6px rgba(100, 255, 150, 0.4);
      }

      /* === FILTER CHIPS === */
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
        border: 1px solid transparent;
        color: inherit;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
      }

      .chip:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .chip.active {
        background: rgba(106, 208, 255, 0.15);
        border-color: rgba(106, 208, 255, 0.5);
        color: var(--accent);
      }

      .chip.locked {
        opacity: 0.5;
        cursor: default;
      }

      .pro-badge {
        font-size: 0.65rem;
        margin-left: 0.3rem;
        opacity: 0.7;
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

      /* === ANIMATIONS === */
      @keyframes flicker {
        0%, 93%, 95%, 97%, 100% { opacity: 0; }
        94% { opacity: 0.06; background: rgba(255, 255, 255, 0.04); }
        96% { opacity: 0.1; background: rgba(200, 255, 220, 0.03); }
      }

      @keyframes ghostDrift {
        0% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(5%, -8%) scale(1.05); }
        50% { transform: translate(-3%, 5%) scale(0.97); }
        75% { transform: translate(7%, 3%) scale(1.03); }
        100% { transform: translate(-5%, -5%) scale(1); }
      }

      @keyframes noiseShift {
        0% { transform: translate(0, 0); }
        33% { transform: translate(-10%, -15%); }
        66% { transform: translate(5%, 10%); }
        100% { transform: translate(-5%, 5%); }
      }

      @keyframes distort {
        0%, 100% { transform: skew(0deg, 0deg) scale(1); }
        25% { transform: skew(0.5deg, -0.3deg) scale(1.01); }
        50% { transform: skew(-0.3deg, 0.5deg) scale(0.99); }
        75% { transform: skew(0.4deg, 0.2deg) scale(1.005); }
      }

      @keyframes echoTrail {
        0%, 100% { filter: blur(0px) opacity(1); }
        50% { filter: blur(1.5px) opacity(0.85); }
      }
    `
  ]
})
export class CameraPanelComponent implements OnDestroy {
  readonly camera = inject(CameraService);
  readonly gallery = inject(GalleryService);
  readonly monetization = inject(MonetizationService);
  readonly permissions = inject(PermissionService);
  readonly session = inject(SessionService);
  readonly audio = inject(AudioSignalService);

  readonly coreFilters: CameraFilter[] = [
    { id: 'grain', label: 'Low-light grain', pro: false },
    { id: 'infrared', label: 'Infrared palette', pro: false },
    { id: 'distortion', label: 'Frame distortion', pro: false }
  ];
  readonly advancedFilters: CameraFilter[] = [
    { id: 'thermal', label: 'Thermal bloom', pro: true },
    { id: 'spectral', label: 'Spectral edge', pro: true },
    { id: 'echo', label: 'Echo trace', pro: true }
  ];

  private activeFilters = signal<Set<string>>(new Set(['grain']));
  noiseLevel = 0;
  private noiseRafId: number | null = null;

  private cameraTransition: Promise<void> = Promise.resolve();

  private readonly pauseHandler = (): void => {
    this.cameraTransition = this.cameraTransition.then(() => this.camera.stopPreview());
  };
  private readonly resumeHandler = (): void => {
    if (this.permissions.granted() && !this.camera.state().active) {
      this.cameraTransition = this.cameraTransition.then(() => this.camera.startPreview('camera-preview'));
    }
  };

  constructor() {
    effect(() => {
      if (this.permissions.granted()) {
        this.cameraTransition = this.cameraTransition.then(() => this.camera.startPreview('camera-preview'));
      } else {
        this.cameraTransition = this.cameraTransition.then(() => this.camera.stopPreview());
      }
    });
    document.addEventListener('pause', this.pauseHandler);
    document.addEventListener('resume', this.resumeHandler);
    this.updateNoise();
  }

  ngOnDestroy(): void {
    void this.camera.stopPreview();
    document.removeEventListener('pause', this.pauseHandler);
    document.removeEventListener('resume', this.resumeHandler);
    if (this.noiseRafId !== null) {
      cancelAnimationFrame(this.noiseRafId);
    }
  }

  isFilterActive(id: string): boolean {
    return this.activeFilters().has(id);
  }

  activeFilterLabel(): string {
    const active = this.activeFilters();
    if (active.size === 0) return 'No filter';
    const all = [...this.coreFilters, ...this.advancedFilters];
    const names = all.filter(f => active.has(f.id)).map(f => f.label);
    return names.join(' + ');
  }

  toggleFilter(filter: CameraFilter): void {
    if (filter.pro && !this.monetization.isProOwned()) {
      return;
    }
    const current = new Set(this.activeFilters());
    if (current.has(filter.id)) {
      current.delete(filter.id);
    } else {
      current.add(filter.id);
    }
    this.activeFilters.set(current);
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

  private updateNoise(): void {
    const amplitude = this.audio.state().amplitude;
    const intensity = this.session.state().intensity;
    const base = 30 + amplitude * 200;
    const jitter = Math.random() * 15 * intensity;
    this.noiseLevel = Math.min(99, Math.max(1, Math.round(base + jitter)));
    this.noiseRafId = requestAnimationFrame(() => this.updateNoise());
  }
}
