package org.birdwanderer.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class BirdMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token) { NativePush.tokenChanged(this,token); }
    @Override public void onMessageReceived(RemoteMessage message) { NativePush.message(this,message.getData()); }
}
