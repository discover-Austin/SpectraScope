package com.spectrascope.nightsessions;

import android.app.Activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "InAppPurchases")
public class InAppPurchasesPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    @Nullable
    private String purchaseCallbackId;

    @PluginMethod
    public void initialize(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        billingClient = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    call.resolve();
                } else {
                    call.reject("Billing setup failed: " + billingResult.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Reconnection handled on next user action.
            }
        });
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.reject("Billing client not ready");
            return;
        }

        JSONArray productIdsArray = call.getArray("productIds");
        if (productIdsArray == null) {
            call.reject("productIds is required");
            return;
        }

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        for (int i = 0; i < productIdsArray.length(); i++) {
            try {
                String productId = productIdsArray.getString(i);
                productList.add(
                        QueryProductDetailsParams.Product.newBuilder()
                                .setProductId(productId)
                                .setProductType(BillingClient.ProductType.INAPP)
                                .build()
                );
            } catch (JSONException e) {
                // Skip invalid entries.
            }
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to query products: " + billingResult.getDebugMessage());
                return;
            }

            JSONArray products = new JSONArray();
            for (ProductDetails details : productDetailsList) {
                JSONObject product = new JSONObject();
                try {
                    product.put("productId", details.getProductId());
                    product.put("title", details.getTitle());
                    product.put("description", details.getDescription());
                    ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
                    if (offer != null) {
                        product.put("price", offer.getFormattedPrice());
                    }
                } catch (JSONException e) {
                    // Skip malformed entry.
                }
                products.put(product);
            }

            JSObject result = new JSObject();
            result.put("products", products);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.reject("Billing client not ready");
            return;
        }

        String productId = call.getString("productId");
        if (productId == null) {
            call.reject("productId is required");
            return;
        }

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
        );

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        call.setKeepAlive(true);
        purchaseCallbackId = call.getCallbackId();
        bridge.saveCall(call);

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || productDetailsList.isEmpty()) {
                releasePurchaseCall(call, "Product not found", false);
                return;
            }

            ProductDetails productDetails = productDetailsList.get(0);
            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(
                            List.of(
                                    BillingFlowParams.ProductDetailsParams.newBuilder()
                                            .setProductDetails(productDetails)
                                            .build()
                            )
                    )
                    .build();

            Activity activity = getActivity();
            if (activity != null) {
                billingClient.launchBillingFlow(activity, flowParams);
            } else {
                releasePurchaseCall(call, "Activity not available", false);
            }
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        PluginCall savedCall = getSavedPurchaseCall();

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged()) {
                    acknowledgePurchaseNatively(purchase);
                }

                JSObject event = new JSObject();
                event.put("purchase", purchaseToJson(purchase));
                notifyListeners("purchaseUpdated", event);
            }

            if (savedCall != null && !purchases.isEmpty()) {
                JSObject result = new JSObject();
                result.put("purchase", purchaseToJson(purchases.get(0)));
                releasePurchaseCall(savedCall, result);
            }
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (savedCall != null) {
                JSObject result = new JSObject();
                result.put("purchase", JSObject.NULL);
                releasePurchaseCall(savedCall, result);
            }
        } else {
            JSObject event = new JSObject();
            event.put("message", billingResult.getDebugMessage());
            notifyListeners("purchaseError", event);

            if (savedCall != null) {
                releasePurchaseCall(savedCall, "Purchase failed: " + billingResult.getDebugMessage(), false);
            }
        }
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.reject("Billing client not ready");
            return;
        }

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchasesList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to restore purchases: " + billingResult.getDebugMessage());
                return;
            }

            JSONArray purchases = new JSONArray();
            for (Purchase purchase : purchasesList) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    if (!purchase.isAcknowledged()) {
                        acknowledgePurchaseNatively(purchase);
                    }
                    purchases.put(purchaseToJson(purchase));
                }
            }

            JSObject result = new JSObject();
            result.put("purchases", purchases);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void finishTransaction(PluginCall call) {
        if (billingClient == null || !billingClient.isReady()) {
            call.reject("Billing client not ready");
            return;
        }

        JSObject purchaseObj = call.getObject("purchase");
        if (purchaseObj == null) {
            call.reject("purchase is required");
            return;
        }

        String transactionId = purchaseObj.getString("transactionId");
        if (transactionId == null) {
            call.resolve();
            return;
        }

        AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(transactionId)
                .build();

        billingClient.acknowledgePurchase(ackParams, billingResult -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                    || billingResult.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                call.resolve();
            } else {
                call.reject("Acknowledge failed: " + billingResult.getDebugMessage());
            }
        });
    }

    private void acknowledgePurchaseNatively(Purchase purchase) {
        AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();

        billingClient.acknowledgePurchase(ackParams, billingResult -> {
            // Best-effort acknowledgment; TS side will also attempt.
        });
    }

    @Nullable
    private PluginCall getSavedPurchaseCall() {
        if (purchaseCallbackId == null) {
            return null;
        }
        return bridge.getSavedCall(purchaseCallbackId);
    }

    private void releasePurchaseCall(PluginCall call, JSObject result) {
        call.resolve(result);
        call.setKeepAlive(false);
        bridge.releaseCall(call);
        purchaseCallbackId = null;
    }

    private void releasePurchaseCall(PluginCall call, String errorMessage, boolean resolved) {
        call.reject(errorMessage);
        call.setKeepAlive(false);
        bridge.releaseCall(call);
        purchaseCallbackId = null;
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSObject obj = new JSObject();
        obj.put("productId", purchase.getProducts().get(0));
        obj.put("transactionId", purchase.getPurchaseToken());
        obj.put("acknowledged", purchase.isAcknowledged());
        return obj;
    }
}
