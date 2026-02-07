import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly cameraCopy = 'Used to render live visual environments during simulation sessions.';
  readonly microphoneCopy = 'Used to drive reactive audio-visual effects during simulation sessions.';

  private readonly statusSignal = signal<string | null>(null);
  readonly status = this.statusSignal.asReadonly();
  private readonly grantedSignal = signal(false);
  readonly granted = this.grantedSignal.asReadonly();

  async requestAll(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      this.grantedSignal.set(true);
      this.statusSignal.set('Permissions granted.');
    } catch (error) {
      this.grantedSignal.set(false);
      this.statusSignal.set('Permissions were not granted.');
      console.error(error);
    }
  }
}
