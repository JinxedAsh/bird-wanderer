package org.birdwanderer.app;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.HashMap;
import java.util.Map;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/** Pure Java origin validation, also covered by local unit tests. */
final class OriginPolicy {
    private OriginPolicy() {}

    static String normalize(String input, boolean debug) {
        if (input == null || input.length() > 2048) throw invalid();
        try {
            URI url = new URI(input.trim());
            String scheme = url.getScheme() == null ? "" : url.getScheme().toLowerCase(Locale.ROOT);
            String host = url.getHost();
            int port = url.getPort();
            if (host == null || host.trim().isEmpty() || url.getRawUserInfo() != null
                    || url.getRawQuery() != null || url.getRawFragment() != null
                    || !(url.getRawPath().isEmpty() || url.getRawPath().equals("/"))
                    || port < -1 || port == 0 || port > 65535) throw invalid();
            host = host.toLowerCase(Locale.ROOT);
            if (host.startsWith("[") && host.endsWith("]")) host = host.substring(1, host.length() - 1);
            if (!scheme.equals("https") && !(debug && scheme.equals("http") && localHost(host))) throw invalid();
            if ((scheme.equals("https") && port == 443) || (scheme.equals("http") && port == 80)) port = -1;
            return scheme + "://" + (host.contains(":") ? "[" + host + "]" : host) + (port == -1 ? "" : ":" + port);
        } catch (URISyntaxException failure) {
            throw invalid();
        }
    }

    static boolean sameOrigin(String url, String origin, boolean debug) {
        if (url == null || origin == null) return false;
        try {
            URI parsed = new URI(url);
            if (parsed.getRawUserInfo() != null || parsed.getHost() == null) return false;
            URI root = new URI(parsed.getScheme(), null, parsed.getHost(), parsed.getPort(), "/", null, null);
            return normalize(root.toString(), debug).equals(origin);
        } catch (URISyntaxException | IllegalArgumentException failure) {
            return false;
        }
    }

    static boolean shareable(String input, String origin, boolean debug) {
        if(input==null||input.length()>2048||!sameOrigin(input,origin,debug))return false;
        try {
            URI url=new URI(input);
            if(!"/".equals(url.getRawPath())||url.getRawFragment()!=null||url.getRawQuery()==null)return false;
            Map<String,String> fields=new HashMap<>();
            for(String part:url.getRawQuery().split("&")){
                String[] pair=part.split("=",2);
                if(pair.length!=2)return false;
                String key=URLDecoder.decode(pair[0],StandardCharsets.UTF_8.name());
                String value=URLDecoder.decode(pair[1],StandardCharsets.UTF_8.name());
                if(fields.put(key,value)!=null)return false;
            }
            String screen=fields.remove("screen");
            if(screen==null||!java.util.Arrays.asList("explore","community","hotspots","journal","profile","species-detail","hotspot-detail","log-observation","life-list","quiz","messages","search","notifications","settings").contains(screen))return false;
            String required="species-detail".equals(screen)?"species":"hotspot-detail".equals(screen)?"hotspot":null;
            if(required!=null)return fields.size()==1&&fields.get(required)!=null&&fields.get(required).matches("[A-Za-z0-9_-]{1,80}");
            if(!"community".equals(screen))return fields.isEmpty();
            return fields.isEmpty()||(fields.size()==1&&(fields.containsKey("post")||fields.containsKey("person"))&&fields.values().iterator().next().matches("[A-Za-z0-9_-]{1,80}"));
        }catch(java.io.UnsupportedEncodingException|URISyntaxException|IllegalArgumentException failure){return false;}
    }

    private static boolean localHost(String host) {
        if (host.equals("localhost") || host.equals("::1")) return true;
        String[] parts = host.split("\\.", -1);
        if (parts.length != 4) return false;
        int[] address = new int[4];
        for (int i = 0; i < 4; i++) {
            if (!parts[i].matches("0|[1-9][0-9]{0,2}")) return false;
            address[i] = Integer.parseInt(parts[i]);
            if (address[i] > 255) return false;
        }
        return address[0] == 127 || address[0] == 10
                || (address[0] == 172 && address[1] >= 16 && address[1] <= 31)
                || (address[0] == 192 && address[1] == 168);
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Enter an HTTPS server origin, without credentials, path, query or fragment. Debug builds also allow localhost or a private IPv4 HTTP address.");
    }
}
