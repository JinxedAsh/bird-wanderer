package org.birdwanderer.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class OriginPolicyTest {
    @Test public void normalizesOriginsWithoutChangingServerIdentity() {
        assertEquals("https://example.test", OriginPolicy.normalize(" https://EXAMPLE.test:443/ ", false));
        assertEquals("https://example.test:8443", OriginPolicy.normalize("https://example.test:8443", false));
        assertEquals("http://localhost:3000", OriginPolicy.normalize("http://localhost:3000/", true));
        assertEquals("http://[::1]:3000", OriginPolicy.normalize("http://[::1]:3000", true));
    }
    @Test public void releaseRejectsAllCleartextAndDebugRejectsPublicCleartext() {
        String[] urls={"http://localhost:3000","http://127.0.0.1","http://10.0.2.2:3000","http://192.168.1.2","http://172.16.0.1"};
        for(String url:urls){reject(url,false);assertEquals(url,OriginPolicy.normalize(url,true));}
        for(String url:new String[]{"http://example.test","http://8.8.8.8","http://172.15.0.1","http://172.32.0.1","http://192.169.1.1","http://0.0.0.0","http://10.0.0.999","http://0127.0.0.1"})reject(url,true);
    }
    @Test public void rejectsConfusingOrNonRootConnectionInput() {
        for(String url:new String[]{"","https://user:pass@example.test","https://example.test/path","https://example.test/?token=x","https://example.test/#x","file:///sdcard/photo.jpg","javascript:alert(1)","intent://example.test","https://example.test:0","https://example.test:65536","https://example.test\\@evil.test","https://example.test//","https://example.test@evil.test"})reject(url,true);
    }
    @Test public void navigationComparesSchemeHostAndPortRatherThanPrefix() {
        String origin="https://example.test";
        assertTrue(OriginPolicy.sameOrigin("https://example.test/birds?q=roller#photo",origin,false));
        assertTrue(OriginPolicy.sameOrigin("https://example.test:443/",origin,false));
        for(String url:new String[]{"https://example.test.evil.test/","https://evil.test/?next=https://example.test","http://example.test/","https://example.test:8443/","https://user@example.test/","file:///https://example.test"})assertFalse(url,OriginPolicy.sameOrigin(url,origin,false));
    }
    private static void reject(String url,boolean debug){try{OriginPolicy.normalize(url,debug);fail("Accepted "+url);}catch(IllegalArgumentException expected){assertNotNull(expected.getMessage());}}
}
