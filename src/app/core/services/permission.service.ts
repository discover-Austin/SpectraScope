import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly cameraCopy = 'Used to render live visual environments during simulation sessions.';
  readonly microphoneCopy = 'Used to drive reactive audio-visual effects during simulation sessions.';

  requestAll(): void {
    // Placeholder for Capacitor runtime permission prompts.
    console.info('Requesting camera and microphone permissions');
  }
}
