import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-session-controls',
  standalone: true,
  imports: [NgFor],
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
          *ngFor="let duration of durations"
          (click)="start(duration)"
        >
          {{ duration }} min
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
    `
  ]
})
export class SessionControlsComponent {
  readonly session = inject(SessionService);
  readonly durations = [3, 5, 10, 15, 20];

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
}
