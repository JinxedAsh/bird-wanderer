package org.birdwanderer.app;

import org.junit.Test;
import java.util.Map;
import static org.junit.Assert.*;

public class PushPolicyTest {
    private static final String USER="11111111-1111-1111-1111-111111111111";
    @Test public void configurationRequiresMatchingAndroidAppAndSender() {
        String key="AIza"+"x".repeat(35);
        assertTrue(PushPolicy.configured("bird-example","123456","1:123456:android:abcdef123456",key));
        assertFalse(PushPolicy.configured("","","",""));
        assertFalse(PushPolicy.configured("bird-example","654321","1:123456:android:abcdef123456",key));
        assertFalse(PushPolicy.configured("bird-example","123456","1:123456:web:abcdef123456",key));
        assertFalse(PushPolicy.configured("bird-example","123456","1:123456:android:abcdef123456","private-service-account-json"));
    }
    @Test public void cookieBindingUsesOnlyOneValidSessionAndStoresItsDigest() {
        String token="a".repeat(64),hash=PushPolicy.cookieHash("other=ignored; bw_session="+token);
        assertEquals(PushPolicy.digest(token),hash);assertNotEquals(token,hash);
        assertNull(PushPolicy.cookieHash(null));assertNull(PushPolicy.cookieHash("bw_session=invalid"));
        assertNull(PushPolicy.cookieHash("bw_session="+token+"; bw_session="+"b".repeat(64)));
        assertFalse(PushPolicy.bound("https://example.test",hash,USER,"https://example.test",PushPolicy.digest("b".repeat(64)),USER));
        assertFalse(PushPolicy.bound("https://example.test",hash,USER,"https://other.test",hash,USER));
        assertFalse(PushPolicy.bound("https://example.test",hash,USER,"https://example.test",hash,"22222222-2222-2222-2222-222222222222"));
        assertTrue(PushPolicy.bound("https://example.test",hash,USER,"https://example.test",hash,USER));
    }
    @Test public void confirmationTicketsExpireAndIdentifiersAreBounded() {
        assertTrue(PushPolicy.ticketCurrent(100,90100));assertFalse(PushPolicy.ticketCurrent(100,90101));assertFalse(PushPolicy.ticketCurrent(100,99));
        assertTrue(PushPolicy.requestId("a".repeat(32)));assertFalse(PushPolicy.requestId("../"));
        assertTrue(PushPolicy.token("fixture-device-token-123456789"));assertFalse(PushPolicy.token("x".repeat(4097)));assertFalse(PushPolicy.token("token<script>"));
    }
    @Test public void notificationsNeverExportProviderPrivateContent() {
        String[] text=PushPolicy.notification(Map.of("title","Private bird","body","private caption","latitude","12.345","photoUrl","https://private.test/image"));
        assertArrayEquals(new String[]{"Bird Wanderer","New subscribed activity. Open the app to check current access."},text);
        String session=PushPolicy.digest("a".repeat(64));
        assertTrue(PushPolicy.deliveryBound(PushPolicy.digest(session),session));
        assertFalse(PushPolicy.deliveryBound(session,session));
        assertFalse(PushPolicy.deliveryBound(PushPolicy.digest(PushPolicy.digest("b".repeat(64))),session));
        assertFalse(PushPolicy.deliveryBound(null,session));
    }
}
