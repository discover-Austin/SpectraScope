import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { GalleryService } from '../../core/services/gallery.service';

@Component({
  selector: 'app-gallery-panel',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <section class="panel">
      <header>
        <h2>Local gallery</h2>
        <button type="button" class="ghost" (click)="clear()" [disabled]="gallery.items().length === 0">
          Clear all
        </button>
      </header>
      <div class="tiles">
        <ng-container *ngIf="gallery.items().length > 0; else emptyState">
          <div class="tile" *ngFor="let tile of gallery.items()">
            <img [src]="tile" alt="Manual capture preview">
            <span class="muted">Stored locally</span>
          </div>
        </ng-container>
        <ng-template #emptyState>
          <div class="tile empty">
            <span>No manual captures yet.</span>
            <span class="muted">Start a session to save images.</span>
          </div>
        </ng-template>
      </div>
      <p class="muted">Only manual captures appear here.</p>
    </section>
  `,
  styles: [
    `
      .panel {
        background: var(--panel);
        border-radius: 20px;
        padding: 1.5rem;
        display: grid;
        gap: 1rem;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 1rem;
      }

      .tile {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 16px;
        padding: 1rem;
        display: grid;
        gap: 0.5rem;
      }

      img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        border-radius: 12px;
      }

      .empty {
        place-items: center;
        text-align: center;
      }

      .muted {
        color: var(--muted);
      }
    `
  ]
})
export class GalleryPanelComponent {
  readonly gallery = inject(GalleryService);

  clear(): void {
    if (confirm('Clear all captures? This cannot be undone.')) {
      this.gallery.clear();
    }
  }
}
