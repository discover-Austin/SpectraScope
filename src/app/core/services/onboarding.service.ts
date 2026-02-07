import { Injectable, signal } from '@angular/core';

export interface OnboardingStep {
  id: 'intro' | 'boundary' | 'permissions' | 'acknowledgment';
  title: string;
  body: string;
}

const STORAGE_KEY = 'spectrascope_onboarding';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly activeStepSignal = signal(0);
  private readonly completedSignal = signal(this.readCompletion());
  private readonly acknowledgedSignal = signal(false);

  readonly steps: OnboardingStep[] = [
    {
      id: 'intro',
      title: 'Atmospheric intro',
      body:
        'SpectraScope creates immersive simulation sessions inspired by paranormal investigation aesthetics.'
    },
    {
      id: 'boundary',
      title: 'Boundary disclosure',
      body: 'No detection. No verification. No physical-world claims.'
    },
    {
      id: 'permissions',
      title: 'Permissions and privacy',
      body: 'Camera and microphone access are used only during active simulation sessions.'
    },
    {
      id: 'acknowledgment',
      title: 'Acknowledgment',
      body: 'Confirm your understanding before entering the session hub.'
    }
  ];

  readonly activeStep = this.activeStepSignal.asReadonly();
  readonly hasCompleted = this.completedSignal.asReadonly();

  advance(): void {
    if (this.activeStepSignal() < this.steps.length - 1) {
      this.activeStepSignal.set(this.activeStepSignal() + 1);
      return;
    }

    if (this.acknowledgedSignal()) {
      this.completedSignal.set(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  }

  retreat(): void {
    if (this.activeStepSignal() > 0) {
      this.activeStepSignal.set(this.activeStepSignal() - 1);
    }
  }

  canAdvance(): boolean {
    if (this.activeStepSignal() === this.steps.length - 1) {
      return this.acknowledgedSignal();
    }
    return true;
  }

  setAcknowledgement(value: boolean): void {
    this.acknowledgedSignal.set(value);
  }

  reset(): void {
    this.activeStepSignal.set(0);
    this.completedSignal.set(false);
    this.acknowledgedSignal.set(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  private readCompletion(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
}
