package com.pawhub.config;

import java.nio.file.Path;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final PawhubProperties props;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> patterns = CorsOriginPatterns.forPawhub(props);
        registry.addMapping("/**")
                .allowedOriginPatterns(patterns.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD")
                .allowedHeaders("*")
                // Match Security CORS — must stay true if any client uses fetch/SockJS credentials "include".
                .allowCredentials(true);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path dir = Path.of(props.getUploadDir()).toAbsolutePath().normalize();
        registry.addResourceHandler("/api/files/**")
                .addResourceLocations(dir.toUri().toString() + "/");
    }
}
