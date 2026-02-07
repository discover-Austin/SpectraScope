import { Component, inject } from '@angular/core';
import { CameraPanelComponent } from '../camera/camera-panel.component';
import { AudioVisualizerComponent } from '../audio/audio-visualizer.component';
import { SessionControlsComponent } from './session-controls.component';
import { GalleryPanelComponent } from '../gallery/gallery-panel.component';
import { MonetizationService } from '../../core/services/monetization.service';
import { DisclaimerService } from '../../core/services/disclaimer.service';

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
        <button type="button" (click)="unlockPro()" *ngIf="!monetization.isProOwned()">Unlock Pro</button>
        <button type="button" class="secondary" (click)="restore()">Restore purchase</button>
        <p class="muted" *ngIf="monetization.isProOwned()">Pro is active on this device.</p>
      </div>
    </section>

    <section class="status" *ngIf="monetization.status()">
      <p [class.error]="monetization.status()?.severity === 'error'">
        {{ monetization.status()?.message }}
      </p>
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
      <p class="muted disclaimer">{{ disclaimer.disclaimer }}</p>
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

      .status {
        background: rgba(106, 208, 255, 0.08);
        border-radius: 16px;
        padding: 0.75rem 1rem;
      }

      .status .error {
        color: #f7c770;
      }

      .footnote {
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 1.5rem;
      }

      .disclaimer {
        font-size: 0.8rem;
        margin-top: 0.75rem;
      }
    `
  ]
})
export class ExperienceHubComponent {
  readonly monetization = inject(MonetizationService);
  readonly disclaimer = inject(DisclaimerService);

  unlockPro(): void {
    void this.monetization.purchasePro();
  }

  restore(): void {
    void this.monetization.restorePurchases();
  }
}
