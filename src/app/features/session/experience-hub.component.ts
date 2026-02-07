import { Component, inject } from '@angular/core';
import { CameraPanelComponent } from '../camera/camera-panel.component';
import { AudioVisualizerComponent } from '../audio/audio-visualizer.component';
import { SessionControlsComponent } from './session-controls.component';
import { GalleryPanelComponent } from '../gallery/gallery-panel.component';
import { MonetizationService } from '../../core/services/monetization.service';

@Component({
  selector: 'app-experience-hub',
  standalone: true,
  imports: [
    CameraPanelComponent,
    AudioVisualizerComponent,
    SessionControlsComponent,
    GalleryPanelComponent
  ],
  template: `
    <section class="hero">
      <div>
        <h2>Session hub</h2>
        <p class="muted">
          Calibrated simulation environments with cinematic overlays and reactive audio visuals.
        </p>
      </div>
      <div class="pro">
        <h3>SpectraScope Pro</h3>
        <p class="muted">
          Unlock advanced visual filters, extended session durations, and custom intensity presets.
        </p>
        <button type="button" (click)="unlockPro()">Unlock Pro</button>
      </div>
    </section>

    <section class="grid">
      <app-camera-panel></app-camera-panel>
      <app-audio-visualizer></app-audio-visualizer>
    </section>

    <section class="grid">
      <app-session-controls></app-session-controls>
      <app-gallery-panel></app-gallery-panel>
    </section>

    <section class="footnote">
      <p class="muted">
        Sessions are designed for entertainment. No claims are made about paranormal activity.
      </p>
    </section>
  `,
  styles: [
    `
      :host {
        display: grid;
        gap: 2rem;
      }

      .hero {
        display: flex;
        justify-content: space-between;
        gap: 2rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .muted {
        color: var(--muted);
      }

      .pro {
        background: var(--panel);
        padding: 1.25rem 1.5rem;
        border-radius: 18px;
        max-width: 320px;
        display: grid;
        gap: 0.75rem;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .footnote {
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 1.5rem;
      }
    `
  ]
})
export class ExperienceHubComponent {
  private readonly monetization = inject(MonetizationService);

  unlockPro(): void {
    this.monetization.unlockPro();
  }
}
