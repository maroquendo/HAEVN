package com.haevn.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if (type.startsWith("text/")) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                String sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
                if (sharedText != null && this.bridge != null && this.bridge.getWebView() != null) {
                    final String cleanText = sharedText.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ");
                    final String cleanSubject = sharedSubject != null ? sharedSubject.replace("\\", "\\\\").replace("'", "\\'") : "";
                    this.bridge.getWebView().post(new Runnable() {
                        @Override
                        public void run() {
                            String js = "window.postMessage({ type: 'HAEVN_SHARE_TARGET', text: '" + cleanText + "', title: '" + cleanSubject + "' }, '*');";
                            bridge.getWebView().evaluateJavascript(js, null);
                        }
                    });
                }
            }
        }
    }
}
