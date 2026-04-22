package com.pawhub.config;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final PawhubProperties props;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> patterns = new ArrayList<>(
                List.of(
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "https://localhost:*",
                        "https://*.up.railway.app",
                        "https://*.railway.app"));
        if (StringUtils.hasText(props.getFrontendBaseUrl())) {
            patterns.add(props.getFrontendBaseUrl().trim());
        }
        registry.addMapping("/**")
                .allowedOriginPatterns(patterns.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD")
                .allowedHeaders("*")
                // Match Security CORS (JWT in Authorization, not cookies)
                .allowCredentials(false);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path dir = Path.of(props.getUploadDir()).toAbsolutePath().normalize();
        registry.addResourceHandler("/api/files/**")
                .addResourceLocations(dir.toUri().toString() + "/");
    }
}
