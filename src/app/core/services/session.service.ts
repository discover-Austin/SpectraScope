import { Injectable, OnDestroy, signal } from '@angular/core';

export interface SessionState {
  isActive: boolean;
  minutesRemaining: number;
  intensity: number;
}

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private readonly stateSignal = signal<SessionState>({
    isActive: false,
    minutesRemaining: 10,
    intensity: 0.6
  });

  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly state = this.stateSignal.asReadonly();

  startSession(durationMinutes: number): void {
    this.clearTimer();
    this.stateSignal.set({
      isActive: true,
      minutesRemaining: durationMinutes,
      intensity: this.stateSignal().intensity
    });
    this.timerId = setInterval(() => this.tick(), 60_000);
  }

  endSession(): void {
    this.clearTimer();
    this.stateSignal.set({
      ...this.stateSignal(),
      isActive: false
    });
  }

  setIntensity(value: number): void {
    this.stateSignal.set({
      ...this.stateSignal(),
      intensity: value
    });
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
