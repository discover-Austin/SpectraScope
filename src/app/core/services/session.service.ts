import { Injectable, signal } from '@angular/core';

export interface SessionState {
  isActive: boolean;
  minutesRemaining: number;
  intensity: number;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly stateSignal = signal<SessionState>({
    isActive: false,
    minutesRemaining: 10,
    intensity: 0.6
  });

  readonly state = this.stateSignal.asReadonly();

  startSession(durationMinutes: number): void {
    this.stateSignal.set({
      isActive: true,
      minutesRemaining: durationMinutes,
      intensity: this.stateSignal().intensity
    });
  }

  endSession(): void {
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
}
