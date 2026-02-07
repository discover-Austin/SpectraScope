import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MonetizationService {
  private readonly proUnlockedSignal = signal(false);

  readonly proUnlocked = this.proUnlockedSignal.asReadonly();

  unlockPro(): void {
    this.proUnlockedSignal.set(true);
  }
}
