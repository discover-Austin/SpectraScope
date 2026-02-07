package com.spectrascope.nightsessions;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(InAppPurchasesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
