import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-gallery-panel',
  standalone: true,
  imports: [NgFor],
  template: `
    <section class="panel">
      <header>
        <h2>Local gallery</h2>
        <button type="button" class="ghost">Clear all</button>
      </header>
      <div class="tiles">
        <div class="tile" *ngFor="let tile of tiles">
          <span>Manual capture</span>
          <span class="muted">Stored locally</span>
        </div>
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

      .muted {
        color: var(--muted);
      }
    `
  ]
})
export class GalleryPanelComponent {
  tiles = Array.from({ length: 4 });
}
