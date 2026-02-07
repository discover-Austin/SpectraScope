package com.spectrascope.nightsessions;

import android.app.Activity;

import androidx.annotation.NonNull;

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

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || productDetailsList.isEmpty()) {
                call.reject("Product not found");
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
                // Only save the call after we successfully launch the billing flow.
                bridge.saveCall(call);
                billingClient.launchBillingFlow(activity, flowParams);
            } else {
                call.reject("Activity not available");
            }
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                JSObject event = new JSObject();
                JSObject purchaseObj = purchaseToJson(purchase);
                event.put("purchase", purchaseObj);
                notifyListeners("purchaseUpdated", event);
            }

            // Resolve the saved purchase call.
            PluginCall savedCall = bridge.getSavedCall();
            if (savedCall != null) {
                JSObject result = new JSObject();
                if (!purchases.isEmpty()) {
                    Purchase firstPurchase = purchases.get(0);
                    result.put("purchase", purchaseToJson(firstPurchase));
                } else {
                    // No purchases returned despite OK response; resolve with null purchase.
                    result.put("purchase", JSObject.NULL);
                }
                savedCall.resolve(result);
                bridge.releaseCall(savedCall);
            }
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            JSObject result = new JSObject();
            result.put("purchase", JSObject.NULL);

            PluginCall savedCall = bridge.getSavedCall();
            if (savedCall != null) {
                savedCall.resolve(result);
                bridge.releaseCall(savedCall);
            }
        } else {
            JSObject event = new JSObject();
            event.put("message", billingResult.getDebugMessage());
            notifyListeners("purchaseError", event);

            PluginCall savedCall = bridge.getSavedCall();
            if (savedCall != null) {
                savedCall.reject("Purchase failed: " + billingResult.getDebugMessage());
                bridge.releaseCall(savedCall);
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
                purchases.put(purchaseToJson(purchase));
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
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                call.resolve();
            } else {
                call.reject("Acknowledge failed: " + billingResult.getDebugMessage());
            }
        });
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSObject obj = new JSObject();
        obj.put("productId", purchase.getProducts().get(0));
        obj.put("transactionId", purchase.getPurchaseToken());
        obj.put("acknowledged", purchase.isAcknowledged());
        return obj;
    }
}
