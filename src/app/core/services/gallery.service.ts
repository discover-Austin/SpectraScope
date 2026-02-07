import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'spectrascope_gallery';

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly itemsSignal = signal<string[]>(this.readItems());

  readonly items = this.itemsSignal.asReadonly();

  addItem(dataUrl: string): void {
    const updated = [dataUrl, ...this.itemsSignal()].slice(0, 24);
    this.itemsSignal.set(updated);
    this.persist(updated);
  }

  clear(): void {
    this.itemsSignal.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist(items: string[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
