package game.umbra.alemdaluz;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import java.io.ByteArrayInputStream;
import java.util.HashMap;

public class MainActivity extends Activity {
  private WebView game;
  private void immersive() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
  }
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    getWindow().setStatusBarColor(0xff0b0b14);
    getWindow().setNavigationBarColor(0xff0b0b14);
    immersive();
    game = new WebView(this);
    game.setBackgroundColor(0xff0b0b14);
    WebSettings s=game.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    s.setBuiltInZoomControls(false);
    s.setSupportZoom(false);
    s.setUseWideViewPort(true);
    s.setLoadWithOverviewMode(true);
    game.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
    });
    game.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return !"umbra.local".equals(request.getUrl().getHost());
      }
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (!"umbra.local".equals(request.getUrl().getHost())) return null;
        String path=request.getUrl().getPath();
        if(path==null || path.equals("/"))path="/index.html";
        if(path.contains(".."))return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));
        String mime=path.endsWith(".js")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".woff2")?"font/woff2":path.endsWith(".png")?"image/png":"text/html";
        try {
          HashMap<String,String> headers=new HashMap<String,String>();
          headers.put("Cache-Control","no-cache");
          headers.put("X-Content-Type-Options","nosniff");
          return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(path.substring(1)));
        } catch(Exception e) {
          return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<String,String>(),new ByteArrayInputStream(new byte[0]));
        }
      }
    });
    setContentView(game);
    game.loadUrl("https://umbra.local/index.html");
  }
  @Override protected void onPause(){super.onPause();game.onPause();game.pauseTimers();}
  @Override protected void onResume(){super.onResume();if(game!=null){game.onResume();game.resumeTimers();}immersive();}
  @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)immersive();}
  @Override public void onBackPressed(){game.evaluateJavascript("document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}))",null);}
  @Override protected void onDestroy(){if(game!=null){game.stopLoading();game.destroy();}super.onDestroy();}
}
