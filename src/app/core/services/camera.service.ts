import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CameraPreview } from '@capacitor-community/camera-preview';

interface CameraState {
  active: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly stateSignal = signal<CameraState>({ active: false, error: null });

  readonly state = this.stateSignal.asReadonly();

  async startPreview(parent: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.stateSignal.set({ active: false, error: null });
      return;
    }

    try {
      await CameraPreview.start({
        parent,
        toBack: true,
        position: 'rear',
        height: 220,
        width: 320,
        enableHighResolution: false
      });
      this.stateSignal.set({ active: true, error: null });
    } catch (error) {
      this.stateSignal.set({ active: false, error: 'Camera preview unavailable.' });
      console.error(error);
    }
  }

  async stopPreview(): Promise<void> {
    try {
      await CameraPreview.stop();
    } catch (error) {
      console.error(error);
    }
    this.stateSignal.set({ active: false, error: null });
  }

  async capture(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const result = await CameraPreview.capture({ quality: 85 });
      if (!result?.value) {
        return null;
      }
      return `data:image/jpeg;base64,${result.value}`;
    } catch (error) {
      this.stateSignal.set({ active: this.stateSignal().active, error: 'Capture failed.' });
      console.error(error);
      return null;
    }
  }
}
