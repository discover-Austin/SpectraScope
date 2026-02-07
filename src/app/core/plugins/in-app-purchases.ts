import { registerPlugin, WebPlugin } from '@capacitor/core';

export interface IapProduct {
  productId: string;
  title?: string;
  description?: string;
  price?: string;
}

export interface IapPurchase {
  productId: string;
  transactionId?: string;
  acknowledged?: boolean;
}

export interface InAppPurchasesPlugin {
  initialize(): Promise<void>;
  getProducts(options: { productIds: string[] }): Promise<{ products: IapProduct[] }>;
  purchase(options: { productId: string }): Promise<{ purchase: IapPurchase | null }>;
  restorePurchases(): Promise<{ purchases: IapPurchase[] }>;
  finishTransaction(options: { purchase: IapPurchase; isConsumable: boolean }): Promise<void>;
  addListener(
    eventName: 'purchaseUpdated',
    listenerFunc: (event: { purchase?: IapPurchase }) => void
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    eventName: 'purchaseError',
    listenerFunc: (event: { message?: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

class InAppPurchasesWeb extends WebPlugin implements InAppPurchasesPlugin {
  async initialize(): Promise<void> {
    // No-op on web; billing only operates on Android.
  }

  async getProducts(_options: { productIds: string[] }): Promise<{ products: IapProduct[] }> {
    return { products: [] };
  }

  async purchase(_options: { productId: string }): Promise<{ purchase: IapPurchase | null }> {
    return { purchase: null };
  }

  async restorePurchases(): Promise<{ purchases: IapPurchase[] }> {
    return { purchases: [] };
  }

  async finishTransaction(_options: { purchase: IapPurchase; isConsumable: boolean }): Promise<void> {
    // No-op on web.
  }
}

export const InAppPurchases = registerPlugin<InAppPurchasesPlugin>('InAppPurchases', {
  web: () => new InAppPurchasesWeb()
});
