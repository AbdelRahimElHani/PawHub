package com.pawhub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "pawhub")
public class PawhubProperties {

    private final Jwt jwt = new Jwt();
    private String uploadDir = "./uploads";
    private String publicBaseUrl = "http://localhost:8080";

    @Getter
    @Setter
    public static class Jwt {
        private String secret = "change-me";
        private long expirationMs = 86400000L;
    }
}
