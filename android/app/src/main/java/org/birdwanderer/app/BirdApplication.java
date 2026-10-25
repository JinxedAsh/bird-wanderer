package org.birdwanderer.app;

import android.app.Application;

public class BirdApplication extends Application {
    @Override public void onCreate() { super.onCreate();NativePush.restore(this); }
}
