import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { SessionService } from '../../core/services/session.service';
import { MonetizationService } from '../../core/services/monetization.service';

@Component({
  selector: 'app-session-controls',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <section class="panel">
      <header>
        <h2>Night session mode</h2>
        <p class="muted">Timed, atmospheric sessions</p>
      </header>
      <div class="durations">
        <button
          type="button"
          class="secondary"
          *ngFor="let duration of baseDurations"
          (click)="start(duration)"
        >
          {{ duration }} min
        </button>
        <button
          type="button"
          class="secondary locked"
          *ngFor="let duration of proDurations"
          (click)="start(duration)"
          [disabled]="!monetization.isProOwned()"
        >
          {{ duration }} min
          <span *ngIf="!monetization.isProOwned()">Pro</span>
        </button>
      </div>
      <div class="intensity">
        <label for="intensity">Intensity</label>
        <input
          id="intensity"
          type="range"
          min="0.2"
          max="1"
          step="0.1"
          [value]="session.state().intensity"
          (input)="updateIntensity($event)"
        >
        <div class="presets">
          <button
            type="button"
            class="secondary locked"
            *ngFor="let preset of presets"
            (click)="applyPreset(preset.value)"
            [disabled]="!monetization.isProOwned()"
          >
            {{ preset.label }}
            <span *ngIf="!monetization.isProOwned()">Pro</span>
          </button>
        </div>
        <p class="muted" *ngIf="!monetization.isProOwned()">
          Custom intensity presets are available with SpectraScope Pro.
        </p>
      </div>
      <div class="summary" *ngIf="session.state().isActive">
        <p>Session Active</p>
        <p class="muted">{{ session.state().minutesRemaining }} minutes remaining</p>
        <button type="button" class="secondary" (click)="end()">End session</button>
      </div>
      <div class="summary" *ngIf="!session.state().isActive">
        <p>Session completed</p>
        <p class="muted">No analysis provided.</p>
      </div>
      <p class="error" *ngIf="session.state().error">{{ session.state().error }}</p>
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

      .muted {
        color: var(--muted);
      }

      .durations {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .intensity {
        display: grid;
        gap: 0.5rem;
      }

      input[type='range'] {
        width: 100%;
      }

      .summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 16px;
        padding: 1rem;
      }

      .presets {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .locked {
        opacity: 0.6;
      }

      .locked span {
        margin-left: 0.5rem;
        font-size: 0.75rem;
      }

      .error {
        color: #f7c770;
        font-size: 0.85rem;
      }
    `
  ]
})
export class SessionControlsComponent {
  readonly session = inject(SessionService);
  readonly monetization = inject(MonetizationService);
  readonly baseDurations = [3, 5, 10];
  readonly proDurations = [15, 20];
  readonly presets = [
    { label: 'Low', value: 0.3 },
    { label: 'Mid', value: 0.6 },
    { label: 'High', value: 0.9 }
  ];

  start(duration: number): void {
    this.session.startSession(duration);
  }

  end(): void {
    this.session.endSession();
  }

  updateIntensity(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.session.setIntensity(value);
  }

  applyPreset(value: number): void {
    this.session.applyPreset(value);
  }
}
