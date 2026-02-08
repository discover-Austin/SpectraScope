import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'spectrascope_gallery';

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly itemsSignal = signal<string[]>(this.readItems());

  readonly items = this.itemsSignal.asReadonly();

  addItem(dataUrl: string): boolean {
    const updated = [dataUrl, ...this.itemsSignal()].slice(0, 24);
    if (!this.persist(updated)) {
      // Storage full - evict oldest items until it fits
      for (let limit = updated.length - 1; limit >= 1; limit--) {
        const trimmed = updated.slice(0, limit);
        if (this.persist(trimmed)) {
          this.itemsSignal.set(trimmed);
          return true;
        }
      }
      return false;
    }
    this.itemsSignal.set(updated);
    return true;
  }

  clear(): void {
    this.itemsSignal.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist(items: string[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  }

  private readItems(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }
}
