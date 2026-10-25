package org.birdwanderer.app;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;

/** Pure policy checks, independent of Android permissions or a live provider. */
final class PushPolicy {
    private PushPolicy() {}
    static boolean configured(String project, String sender, String app, String key) {
        return project != null && project.matches("[a-z][a-z0-9-]{4,28}[a-z0-9]")
                && sender != null && sender.matches("[0-9]{6,30}")
                && app != null && app.matches("1:" + sender + ":android:[a-f0-9]{8,64}")
                && key != null && key.matches("AIza[A-Za-z0-9_-]{35}");
    }
    static boolean requestId(String value) { return value != null && value.matches("[a-f0-9]{32}"); }
    static boolean userId(String value) { return value != null && value.matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}"); }
    static boolean token(String value) { return value != null && value.matches("[A-Za-z0-9_:\\-]{20,4096}"); }
    static String digest(String value) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte part : bytes) result.append(String.format(java.util.Locale.ROOT, "%02x", part & 255));
            return result.toString();
        } catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    static String cookieHash(String cookies) {
        if (cookies == null) return null;
        String token = null;
        for (String part : cookies.split(";")) {
            String entry = part.trim();
            if (!entry.startsWith("bw_session=")) continue;
            if (token != null) return null;
            token = entry.substring("bw_session=".length());
            if (!token.matches("[a-f0-9]{64}")) return null;
        }
        return token == null ? null : digest(token);
    }
    static boolean bound(String savedOrigin, String savedHash, String savedUser,
                         String origin, String hash, String user) {
        return hash != null && userId(user) && origin != null && origin.equals(savedOrigin)
                && hash.equals(savedHash) && user.equals(savedUser);
    }
    static boolean ticketCurrent(long issued, long now) { return now >= issued && now - issued <= 90000; }
    static boolean deliveryBound(String binding,String sessionHash) {
        return binding!=null&&binding.matches("[a-f0-9]{64}")&&sessionHash!=null&&binding.equals(digest(sessionHash));
    }
    static String[] notification(Map<String,String> ignoredPayload) {
        // Never copy species, caption, location, URLs or arbitrary provider text.
        return new String[]{"Bird Wanderer", "New subscribed activity. Open the app to check current access."};
    }
}
