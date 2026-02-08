import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { MonetizationService } from './monetization.service';

export interface SessionState {
  isActive: boolean;
  minutesRemaining: number;
  intensity: number;
  error: string | null;
}

const FREE_MAX_DURATION = 10;

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private readonly monetization = inject(MonetizationService);

  private readonly stateSignal = signal<SessionState>({
    isActive: false,
    minutesRemaining: 10,
    intensity: 0.6,
    error: null
  });

  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly state = this.stateSignal.asReadonly();

  startSession(durationMinutes: number): void {
    if (durationMinutes <= 0 || !Number.isFinite(durationMinutes)) {
      return;
    }

    if (durationMinutes > FREE_MAX_DURATION && !this.monetization.isProOwned()) {
      this.stateSignal.set({
        ...this.stateSignal(),
        error: 'Extended durations require SpectraScope Pro.'
      });
      return;
    }

    this.clearTimer();
    this.stateSignal.set({
      isActive: true,
      minutesRemaining: durationMinutes,
      intensity: this.stateSignal().intensity,
      error: null
    });
    this.timerId = setInterval(() => this.tick(), 60_000);
  }

  endSession(): void {
    this.clearTimer();
    this.stateSignal.set({
      ...this.stateSignal(),
      isActive: false,
      error: null
    });
  }

  setIntensity(value: number): void {
    this.stateSignal.set({
      ...this.stateSignal(),
      intensity: value
    });
  }

  applyPreset(value: number): void {
    if (!this.monetization.isProOwned()) {
      return;
    }
    this.setIntensity(value);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private tick(): void {
    const current = this.stateSignal();
    if (!current.isActive) {
      this.clearTimer();
      return;
    }

    const next = current.minutesRemaining - 1;
    if (next <= 0) {
      this.clearTimer();
      this.stateSignal.set({
        ...current,
        isActive: false,
        minutesRemaining: 0
      });
    } else {
      this.stateSignal.set({
        ...current,
        minutesRemaining: next
      });
    }
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
