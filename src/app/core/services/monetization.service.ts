import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BillingStatus } from './billing-status.model';
import { InAppPurchases } from '@capacitor-community/in-app-purchases';

interface IapProduct {
  productId: string;
  title?: string;
  description?: string;
  price?: string;
}

interface IapPurchase {
  productId: string;
  transactionId?: string;
  acknowledged?: boolean;
}

interface IapPlugin {
  initialize(): Promise<void>;
  getProducts(options: { productIds: string[] }): Promise<{ products: IapProduct[] }>;
  purchase(options: { productId: string }): Promise<{ purchase: IapPurchase | null }>;
  restorePurchases(): Promise<{ purchases: IapPurchase[] }>;
  finishTransaction(options: { purchase: IapPurchase; isConsumable: boolean }): Promise<void>;
  addListener(
    eventName: 'purchaseUpdated' | 'purchaseError',
    listenerFunc: (event: { purchase?: IapPurchase; message?: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const PRODUCT_ID = 'spectrascope_pro';
const STORAGE_KEY = 'spectrascope_pro_owned';

@Injectable({ providedIn: 'root' })
export class MonetizationService {
  private readonly iap = InAppPurchases as unknown as IapPlugin;
  private readonly isProOwnedSignal = signal(this.readOwned());
  private readonly statusSignal = signal<BillingStatus | null>(null);
  private readonly readySignal = signal(false);
  private readonly productSignal = signal<IapProduct | null>(null);

  readonly isProOwned = this.isProOwnedSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();
  readonly product = this.productSignal.asReadonly();

  async initialize(): Promise<void> {
    if (this.readySignal()) {
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      this.readySignal.set(true);
      this.statusSignal.set({
        message: 'Billing is available on Android devices.',
        severity: 'info'
      });
      return;
    }

    try {
      await this.iap.initialize();
      await this.loadProducts();
      await this.restorePurchases();
      await this.attachListeners();
      this.readySignal.set(true);
    } catch (error) {
      this.statusSignal.set({
        message: 'Billing is unavailable. Please try again later.',
        severity: 'error'
      });
      console.error(error);
    }
  }

  async purchasePro(): Promise<void> {
    if (this.isProOwnedSignal()) {
      return;
    }

    try {
      const result = await this.iap.purchase({ productId: PRODUCT_ID });
      if (result.purchase) {
        await this.acknowledge(result.purchase);
      }
    } catch (error) {
      this.statusSignal.set({
        message: 'Purchase did not complete. You can try again later.',
        severity: 'warning'
      });
      console.error(error);
    }
  }

  async restorePurchases(): Promise<void> {
    try {
      const result = await this.iap.restorePurchases();
      const owned = result.purchases.some((purchase) => purchase.productId === PRODUCT_ID);
      if (owned) {
        this.setOwned(true);
      }
    } catch (error) {
      this.statusSignal.set({
        message: 'Restoring purchases is unavailable right now.',
        severity: 'warning'
      });
      console.error(error);
    }
  }

  private async loadProducts(): Promise<void> {
    const { products } = await this.iap.getProducts({ productIds: [PRODUCT_ID] });
    this.productSignal.set(products?.[0] ?? null);
  }

  private async acknowledge(purchase: IapPurchase): Promise<void> {
    if (purchase.productId !== PRODUCT_ID) {
      return;
    }

    await this.iap.finishTransaction({ purchase, isConsumable: false });
    this.setOwned(true);
    this.statusSignal.set({
      message: 'SpectraScope Pro is now unlocked.',
      severity: 'info'
    });
  }

  private async attachListeners(): Promise<void> {
    await this.iap.addListener('purchaseUpdated', async (event) => {
      if (event.purchase) {
        await this.acknowledge(event.purchase);
      }
    });

    await this.iap.addListener('purchaseError', (event) => {
      this.statusSignal.set({
        message: event.message ?? 'A billing error occurred.',
        severity: 'warning'
      });
    });
  }

  private setOwned(value: boolean): void {
    this.isProOwnedSignal.set(value);
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  }

  private readOwned(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
}
