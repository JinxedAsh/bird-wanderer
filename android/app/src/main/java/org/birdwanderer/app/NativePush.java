package org.birdwanderer.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.webkit.CookieManager;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.lang.ref.WeakReference;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

/** Native token/permission adapter. The existing authenticated web API still
 * owns account registration, subscriptions, privacy and delivery authorization. */
final class NativePush {
    static final int PERMISSION_REQUEST = 102;
    private static final String PREFERENCES = "bird-wanderer-push", CHANNEL = "subscribed-activity";
    private static final int NOTIFICATION = 310;
    private static WeakReference<MainActivity> foreground = new WeakReference<>(null);
    private final MainActivity host;
    private Ticket pending;

    private static final class Ticket {
        final String id, user, origin, session, previousRegistration;
        final long issued = SystemClock.elapsedRealtime();
        String token;
        boolean tokenRequested;
        Ticket(String id, String user, String origin, String session, String previousRegistration) {
            this.id=id; this.user=user; this.origin=origin; this.session=session;this.previousRegistration=previousRegistration;
        }
    }
    NativePush(MainActivity host) { this.host=host; }
    static boolean configured() {
        return PushPolicy.configured(BuildConfig.FIREBASE_PROJECT_ID, BuildConfig.FIREBASE_SENDER_ID,
                BuildConfig.FIREBASE_APP_ID, BuildConfig.FIREBASE_API_KEY);
    }
    private static SharedPreferences preferences(Context context) { return context.getSharedPreferences(PREFERENCES,Context.MODE_PRIVATE); }
    private static String session(String origin) {
        try { return PushPolicy.cookieHash(CookieManager.getInstance().getCookie(origin)); }
        catch(RuntimeException unavailable) { return null; }
    }
    private static boolean bound(Context context, String origin, String user) {
        SharedPreferences state=preferences(context);
        return BuildConfig.FIREBASE_PROJECT_ID.equals(state.getString("project",""))
                &&PushPolicy.bound(state.getString("origin",""),state.getString("session",""),state.getString("user",""),origin,session(origin),user);
    }
    private static void initialize(Context context,boolean automatic) {
        if(!configured())throw new IllegalStateException("Firebase Android configuration is missing.");
        FirebaseApp app=null;
        for(FirebaseApp candidate:FirebaseApp.getApps(context))if(FirebaseApp.DEFAULT_APP_NAME.equals(candidate.getName()))app=candidate;
        if(app==null)app=FirebaseApp.initializeApp(context,new FirebaseOptions.Builder()
                .setProjectId(BuildConfig.FIREBASE_PROJECT_ID).setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
                .setApplicationId(BuildConfig.FIREBASE_APP_ID).setApiKey(BuildConfig.FIREBASE_API_KEY).build());
        FirebaseOptions actual=app.getOptions();
        if(!BuildConfig.FIREBASE_PROJECT_ID.equals(actual.getProjectId())||!BuildConfig.FIREBASE_SENDER_ID.equals(actual.getGcmSenderId())
                ||!BuildConfig.FIREBASE_APP_ID.equals(actual.getApplicationId())||!BuildConfig.FIREBASE_API_KEY.equals(actual.getApiKey()))
            throw new IllegalStateException("The default Firebase application does not match this Android build.");
        // No automatic work before confirmation. A confirmed/restored opt-in may
        // maintain its token; refresh pauses it until the user re-registers.
        FirebaseMessaging.getInstance().setAutoInitEnabled(automatic);
    }
    static void restore(Context context) {
        SharedPreferences state=preferences(context);
        if(!state.getBoolean("enabled",false))return;
        if(!configured()||!notificationPermission(context)||!bound(context,state.getString("origin",""),state.getString("user",""))){clear(context);return;}
        try { initialize(context,true); } catch(RuntimeException unavailable) { clear(context); }
    }
    static void attach(MainActivity host) { foreground=new WeakReference<>(host); }
    static void detach(MainActivity host) { if(foreground.get()==host)foreground.clear(); }
    static void clear(Context context) {
        preferences(context).edit().clear().apply();
        context.getSystemService(NotificationManager.class).cancel(NOTIFICATION);
        pauseAutomatic(context);
        // No token deletion race with a subsequent opt-in. Server removal and
        // local disabled/session gates stop delivery; automatic work is off.
    }
    private static void pauseAutomatic(Context context) {
        for(FirebaseApp app:FirebaseApp.getApps(context))if(FirebaseApp.DEFAULT_APP_NAME.equals(app.getName())){
            FirebaseMessaging.getInstance().setAutoInitEnabled(false);break;
        }
    }
    boolean busy() { return pending!=null&&PushPolicy.ticketCurrent(pending.issued,SystemClock.elapsedRealtime()); }
    void cancel() { pending=null; }
    private boolean current(Ticket ticket) {
        return pending==ticket&&host.trusted()&&ticket.origin.equals(host.serverOrigin())
                &&ticket.session.equals(session(ticket.origin))&&PushPolicy.ticketCurrent(ticket.issued,SystemClock.elapsedRealtime());
    }
    private static JSONObject result(Object... values) {
        JSONObject result=new JSONObject();
        try { for(int i=0;i<values.length;i+=2)result.put((String)values[i],values[i+1]); }
        catch(JSONException impossible){throw new IllegalStateException(impossible);}
        return result;
    }
    private void send(String id, JSONObject value) { host.emitNativePush(id,value); }
    private void fail(String id,String message) { send(id,result("error",message)); }
    private JSONObject status(String user) {
        SharedPreferences original=preferences(host);
        String currentSession=session(host.serverOrigin());
        if(currentSession!=null&&currentSession.equals(original.getString("session",""))
                &&host.serverOrigin().equals(original.getString("origin",""))&&!user.equals(original.getString("user","")))
            return result("error","The Android account changed. Refresh Notifications.");
        boolean matches=bound(host,host.serverOrigin(),user);
        if(!matches)clear(host);
        SharedPreferences state=preferences(host);
        boolean permitted=notificationPermission(host);
        return result("configured",configured(),"projectId",configured()?BuildConfig.FIREBASE_PROJECT_ID:"",
                "binding",currentSession==null?"":PushPolicy.digest(currentSession),
                "active",matches&&state.getBoolean("enabled",false)&&permitted,
                "needsRegistration",matches&&(state.getBoolean("needsRegistration",false)||(state.getBoolean("enabled",false)&&!permitted)));
    }
    void handle(Uri uri,boolean gesture) {
        if(!host.trusted())return;
        String id=uri.getQueryParameter("id"),action=uri.getQueryParameter("action"),user=uri.getQueryParameter("user");
        if(!PushPolicy.requestId(id))return;
        if("clear".equals(action)){
            String expected=uri.getQueryParameter("binding");
            if(expected!=null&&!PushPolicy.deliveryBound(expected,session(host.serverOrigin()))){fail(id,"The Android session changed before push could be cleared.");return;}
            String capability=uri.getQueryParameter("ticket");
            if(capability==null){
                SharedPreferences saved=preferences(host);
                String currentSession=session(host.serverOrigin());
                if(user!=null&&!user.isEmpty()&&currentSession!=null
                        &&currentSession.equals(saved.getString("session",""))
                        &&!saved.getString("user","").isEmpty()&&!user.equals(saved.getString("user",""))){
                    fail(id,"The Android account changed before push could be cleared.");return;
                }
                cancel();clear(host);
            }
            else {
                Ticket ticket=pending;
                if(ticket!=null&&ticket.id.equals(capability)){
                    if(current(ticket)&&ticket.user.equals(preferences(host).getString("user",""))
                            &&ticket.previousRegistration.equals(preferences(host).getString("registrationTicket","")))clear(host);
                    cancel();
                } else if(capability.equals(preferences(host).getString("registrationTicket","")))clear(host);
            }
            send(id,result("active",false));return;
        }
        if("cancel".equals(action)){
            if(pending!=null&&pending.id.equals(uri.getQueryParameter("ticket")))cancel();
            return;
        }
        if(!PushPolicy.userId(user)){fail(id,"Sign in before configuring Android push.");return;}
        if("status".equals(action)){send(id,status(user));return;}
        if("confirm".equals(action)){
            Ticket ticket=pending;
            if(ticket==null||!ticket.id.equals(uri.getQueryParameter("ticket"))||!ticket.user.equals(user)||!current(ticket)||!PushPolicy.token(ticket.token)){
                cancel();fail(id,"Push registration expired or the session changed. Enable push again.");return;
            }
            if(!notificationPermission(host)){cancel();fail(id,"Notification permission changed. Enable push again.");return;}
            try { initialize(host,true); }
            catch(RuntimeException unavailable){cancel();fail(id,"Android Firebase confirmation failed. Check the configuration.");return;}
            preferences(host).edit().putBoolean("enabled",true).putBoolean("needsRegistration",false)
                    .putString("origin",ticket.origin).putString("session",ticket.session).putString("user",ticket.user)
                    .putString("registrationTicket",ticket.id)
                    .putString("project",BuildConfig.FIREBASE_PROJECT_ID)
                    .putString("tokenHash",PushPolicy.digest(ticket.token)).apply();
            cancel();send(id,status(user));return;
        }
        if(!"token".equals(action)){fail(id,"Unknown native push action.");return;}
        if(!gesture||!host.canStartNativePrompt()||busy()){fail(id,"Finish the current native prompt, then tap Enable push again.");return;}
        if(!configured()){fail(id,"This Android build has no valid Firebase configuration. In-app alerts still work.");return;}
        JSONObject state=status(user);
        if(state.has("error")){send(id,state);return;}
        String binding=session(host.serverOrigin());
        if(binding==null){fail(id,"Your session has ended. Sign in again.");return;}
        pending=new Ticket(id,user,host.serverOrigin(),binding,preferences(host).getString("registrationTicket",""));
        if(Build.VERSION.SDK_INT>=33&&host.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            host.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION_REQUEST);
        else requestToken();
    }
    void permissionResult() { requestToken(); }
    private static boolean notificationPermission(Context context) {
        NotificationManager manager=context.getSystemService(NotificationManager.class);
        NotificationChannel channel=manager.getNotificationChannel(CHANNEL);
        return (Build.VERSION.SDK_INT<33||context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)
                &&manager.areNotificationsEnabled()&&(channel==null||channel.getImportance()!=NotificationManager.IMPORTANCE_NONE);
    }
    private void requestToken() {
        Ticket ticket=pending;
        if(ticket==null)return;
        if(!current(ticket)){cancel();return;}
        if(!notificationPermission(host)){cancel();fail(ticket.id,"Notification permission is not granted. In-app alerts still work.");return;}
        if(ticket.tokenRequested)return;
        ticket.tokenRequested=true;
        try {
            initialize(host,false);
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task->host.runOnUiThread(()->{
                if(!current(ticket))return;
                if(!task.isSuccessful()||!PushPolicy.token(task.getResult())){
                    cancel();fail(ticket.id,"Firebase did not return a registration. Check configuration/network and retry.");return;
                }
                ticket.token=task.getResult();
                send(ticket.id,result("token",ticket.token,"projectId",BuildConfig.FIREBASE_PROJECT_ID,"ticket",ticket.id,"binding",PushPolicy.digest(ticket.session)));
            }));
        }catch(RuntimeException unavailable){cancel();fail(ticket.id,"Android Firebase initialization failed. Check the build configuration.");}
    }
    static void tokenChanged(Context context,String token) {
        new Handler(Looper.getMainLooper()).post(()->{
            SharedPreferences state=preferences(context);
            if(!state.getBoolean("enabled",false))return;
            if(!bound(context,state.getString("origin",""),state.getString("user",""))){clear(context);return;}
            if(PushPolicy.token(token)&&!PushPolicy.digest(token).equals(state.getString("tokenHash",""))){
                state.edit().putBoolean("enabled",false).putBoolean("needsRegistration",true).apply();
                pauseAutomatic(context);
                context.getSystemService(NotificationManager.class).cancel(NOTIFICATION);
                MainActivity activity=foreground.get();if(activity!=null)activity.nativePushChanged();
            }
        });
    }
    static void message(Context context,Map<String,String> payload) {
        new Handler(Looper.getMainLooper()).post(()->{
            SharedPreferences state=preferences(context);
            if(!state.getBoolean("enabled",false))return;
            if(!BuildConfig.FIREBASE_PROJECT_ID.equals(payload.get("project")))return;
            if(!PushPolicy.deliveryBound(payload.get("binding"),state.getString("session",null)))return;
            if(!bound(context,state.getString("origin",""),state.getString("user",""))){clear(context);return;}
            if(!notificationPermission(context))return;
            MainActivity activity=foreground.get();
            if(activity!=null&&activity.trusted()){activity.nativePushChanged();return;}
            NotificationManager manager=context.getSystemService(NotificationManager.class);
            manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Subscribed activity",NotificationManager.IMPORTANCE_DEFAULT));
            String[] text=PushPolicy.notification(payload);
            Intent open=new Intent(context,MainActivity.class).putExtra("notifications",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent destination=PendingIntent.getActivity(context,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            Notification notification=new Notification.Builder(context,CHANNEL).setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle(text[0]).setContentText(text[1]).setVisibility(Notification.VISIBILITY_PRIVATE)
                    .setContentIntent(destination).setAutoCancel(true).build();
            manager.notify(NOTIFICATION,notification);
        });
    }
}
