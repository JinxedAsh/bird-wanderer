package org.birdwanderer.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/** Small Android host for the existing React app and its same-origin Express API. */
public class MainActivity extends Activity {
    private static final int CHOOSE_PHOTO = 100, LOCATION_PERMISSION = 101;
    private String origin;
    private WebView webView;
    private ValueCallback<Uri[]> photoCallback;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private boolean connected;

    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        origin = getPreferences(MODE_PRIVATE).getString("serverOrigin", "");
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::handleBack);
        }
        try {
            origin = OriginPolicy.normalize(origin, BuildConfig.DEBUG);
            openApp();
        } catch (IllegalArgumentException failure) {
            showConnection("");
        }
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private void fitSystemBars(View root) {
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        root.requestApplyInsets();
    }

    private TextView text(String value, int size) {
        TextView label = new TextView(this);
        label.setText(value); label.setTextSize(size); label.setTextColor(Color.rgb(24, 28, 32));
        label.setPadding(0, dp(8), 0, dp(8));
        return label;
    }

    private void showConnection(String problem) {
        connected = false;
        cancelPendingPermissions();
        destroyWebView();
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL); page.setPadding(dp(24), dp(24), dp(24), dp(24));
        page.setGravity(Gravity.CENTER_VERTICAL); page.setBackgroundColor(Color.rgb(247,249,255));
        page.addView(text("BIRD WANDERER", 14));
        page.addView(text("Connect to your field server", 24));
        page.addView(text("Use the address serving both Bird Wanderer and its API. The server must be running and reachable. No account or photograph is stored in this setup form.", 15));
        if (!problem.isEmpty()) page.addView(text(problem, 15));
        EditText address = new EditText(this);
        address.setSingleLine(true); address.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        address.setHint("https://your-server.example"); address.setText(origin);
        address.setContentDescription("Bird Wanderer server origin");
        address.setMinHeight(dp(48)); page.addView(address);
        page.addView(text(BuildConfig.DEBUG ? "Debug demo: HTTPS, localhost or private IPv4 HTTP only. Your server must allow that exact origin. Local HTTP is not a secure public deployment." : "Release: HTTPS is required. Use only a server you trust with your account.", 13));
        page.addView(text("Changing servers signs this app out and clears its web cache. Records stay on their original server. Android WebView push delivery is not configured.", 13));
        Button open = new Button(this); open.setText(R.string.save_and_open); open.setMinHeight(dp(48));
        open.setOnClickListener(view -> {
            try {
                String next = OriginPolicy.normalize(address.getText().toString(), BuildConfig.DEBUG);
                boolean changing = !next.equals(origin);
                origin = next;
                getPreferences(MODE_PRIVATE).edit().putString("serverOrigin", origin).apply();
                if (changing) {
                    WebStorage.getInstance().deleteAllData();
                    CookieManager.getInstance().removeAllCookies(value -> { CookieManager.getInstance().flush(); openApp(); });
                } else openApp();
            } catch (IllegalArgumentException failure) { address.setError(failure.getMessage()); }
        });
        page.addView(open);
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.addView(page);
        setContentView(scroll); fitSystemBars(scroll);
    }

    @SuppressWarnings("deprecation")
    private void openApp() {
        if (isFinishing()) return;
        destroyWebView();
        webView = new WebView(this);
        connected = true;
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // Existing React interface; no native JavaScript bridge.
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " BirdWandererAndroid/0.1");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                String url = request.getUrl().toString();
                if (url.equals("birdwanderer://connection") && request.hasGesture() && trusted()) {
                    view.post(() -> {if(webView==view)showConnection("");}); return true;
                }
                if (OriginPolicy.sameOrigin(url, origin, BuildConfig.DEBUG)) return false;
                if (request.hasGesture()) openExternal(request.getUrl());
                else connectionError(view,"A redirect left the configured server. Check its address; no certificate or origin restriction was bypassed.");
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                if (!OriginPolicy.sameOrigin(url, origin, BuildConfig.DEBUG)) {
                    view.stopLoading(); connectionError(view,"The page left the configured server.");
                }
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String scheme = request.getUrl().getScheme();
                if ("file".equals(scheme) || "content".equals(scheme)) {
                    return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", java.util.Collections.emptyMap(), new ByteArrayInputStream("Local resource access disabled".getBytes(StandardCharsets.UTF_8)));
                }
                return null;
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); if(OriginPolicy.sameOrigin(error.getUrl(),origin,BuildConfig.DEBUG)) connectionError(view,"The server certificate could not be verified. Fix the certificate or server address; unsafe certificates are never accepted.");
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) connectionError(view,"Cannot reach the server. Check the connection and address, then retry Save and open.");
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame()) connectionError(view,"The server returned HTTP " + response.getStatusCode() + ". Check that this address serves the app.");
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (view != webView || !trusted() || params.getMode() != FileChooserParams.MODE_OPEN) return false;
                if (photoCallback != null) photoCallback.onReceiveValue(null);
                photoCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType("image/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png"});
                try { startActivityForResult(intent, CHOOSE_PHOTO); }
                catch (ActivityNotFoundException failure) { photoCallback.onReceiveValue(null); photoCallback = null; Toast.makeText(MainActivity.this,"No photograph picker is installed.",Toast.LENGTH_LONG).show(); }
                return true;
            }
            @Override public void onGeolocationPermissionsShowPrompt(String requestedOrigin, GeolocationPermissions.Callback callback) {
                if (!trusted() || !OriginPolicy.sameOrigin(requestedOrigin, origin, BuildConfig.DEBUG)) { callback.invoke(requestedOrigin, false, false); return; }
                if (locationCallback != null) locationCallback.invoke(locationOrigin, false, false);
                locationCallback = callback; locationOrigin = requestedOrigin;
                if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) finishLocationPermission();
                else requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_PERMISSION);
            }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, android.os.Message result) {
                if (!trusted() || !userGesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView temporary, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        if (trusted() && OriginPolicy.sameOrigin(uri.toString(), origin, BuildConfig.DEBUG)) webView.loadUrl(uri.toString());
                        else openExternal(uri);
                        temporary.post(temporary::destroy); return true;
                    }
                });
                ((WebView.WebViewTransport) result.obj).setWebView(popup); result.sendToTarget(); return true;
            }
        });
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.addView(webView,new LinearLayout.LayoutParams(-1,-1));
        setContentView(root); fitSystemBars(root);
        webView.loadUrl(origin + "/");
    }

    private void connectionError(WebView failed, String problem) {
        failed.post(() -> { if (webView == failed && connected) showConnection(problem); });
    }

    private void destroyWebView() {
        if (webView == null) return;
        if (webView.getParent() instanceof android.view.ViewGroup) ((android.view.ViewGroup) webView.getParent()).removeView(webView);
        webView.stopLoading(); webView.destroy(); webView = null;
    }

    private boolean trusted() { return connected && webView != null && OriginPolicy.sameOrigin(webView.getUrl(),origin,BuildConfig.DEBUG); }

    private void openExternal(Uri uri) {
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getHost() == null || uri.getUserInfo() != null) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException failure) { Toast.makeText(this,"No browser or maps application is available.",Toast.LENGTH_LONG).show(); }
    }

    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if (request != CHOOSE_PHOTO || photoCallback == null) return;
        ValueCallback<Uri[]> callback = photoCallback; photoCallback = null;
        Uri selected = result == RESULT_OK && data != null ? data.getData() : null;
        boolean accepted = false;
        try {
            if (trusted() && selected != null && "content".equals(selected.getScheme())) {
                String type = getContentResolver().getType(selected);
                accepted = "image/jpeg".equals(type) || "image/png".equals(type);
                try (Cursor cursor = getContentResolver().query(selected,new String[]{OpenableColumns.SIZE},null,null,null)) {
                    if (cursor != null && cursor.moveToFirst() && !cursor.isNull(0)) { long bytes=cursor.getLong(0); accepted &= bytes > 0 && bytes <= 10L*1024*1024; }
                }
            }
        } catch (RuntimeException failure) { accepted = false; }
        callback.onReceiveValue(accepted ? new Uri[]{selected} : null);
        if (selected != null && !accepted) Toast.makeText(this,"Choose one JPEG/PNG photograph up to 10 MiB. The server also validates its real content.",Toast.LENGTH_LONG).show();
    }

    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results) {
        super.onRequestPermissionsResult(request,permissions,results);
        if (request == LOCATION_PERMISSION) finishLocationPermission();
    }

    private void finishLocationPermission() {
        if (locationCallback == null) return;
        boolean granted = trusted() && OriginPolicy.sameOrigin(locationOrigin,origin,BuildConfig.DEBUG)
                && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        locationCallback.invoke(locationOrigin,granted,false); locationCallback=null; locationOrigin=null;
    }

    private void cancelPendingPermissions() {
        if (photoCallback != null) { photoCallback.onReceiveValue(null); photoCallback=null; }
        if (locationCallback != null) { locationCallback.invoke(locationOrigin,false,false); locationCallback=null; locationOrigin=null; }
    }

    @SuppressWarnings("deprecation")
    private void handleBack() {
        if (!trusted()) { finish(); return; }
        webView.evaluateJavascript("(()=>{if(document.querySelector('[role=dialog]')){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return true;}const back=document.querySelector('button[aria-label=\"Go back\"]');if(back){back.click();return true;}return false;})()",handled -> {
            if ("true".equals(handled)) return;
            if (webView != null && webView.canGoBack()) webView.goBack(); else finish();
        });
    }

    // Only API26–32 uses this fallback; API33+ registers OnBackInvokedDispatcher in onCreate.
    @android.annotation.SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onPause() { if(webView!=null)webView.onPause();CookieManager.getInstance().flush();super.onPause(); }
    @Override protected void onResume() { super.onResume();if(webView!=null)webView.onResume(); }
    @Override protected void onDestroy() { cancelPendingPermissions();destroyWebView();super.onDestroy(); }
}
