package com.pawhub.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawhub.config.GeminiModelIds;
import com.pawhub.config.PawhubProperties;
import com.pawhub.web.dto.WhiskerStatusDto;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Verifies PawBot can talk to Gemini: minimal {@code generateContent} using the configured chat model
 * (and primary {@code pawhub.gemini.model} on 404), so status reflects a real round trip, not only a
 * non-empty API key.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WhiskerHealthService {

    private static final String GENERATE_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final PawhubProperties props;
    private final ObjectMapper objectMapper;

    public WhiskerStatusDto check() {
        PawhubProperties.Gemini g = props.getGemini();
        if (!g.isEnabled()) {
            return new WhiskerStatusDto(false, "Gemini is disabled on the server (pawhub.gemini.enabled).");
        }
        if (g.getApiKey() == null || g.getApiKey().isBlank()) {
            return new WhiskerStatusDto(
                    false,
                    "No API key configured. Set PAWHUB_GEMINI_API_KEY or backend/config/application-secrets.yml.");
        }

        String whiskerModel = pickWhiskerModel(g);
        String backup = primaryGeminiModel(g);
        WhiskerStatusDto first = pingModel(g, whiskerModel);
        if (first.ok()) {
            return first;
        }
        if (!whiskerModel.equals(backup) && looksLikeModelNotFound(first.message())) {
            log.debug("PawBot health: retrying with primary model {}", backup);
            return pingModel(g, backup);
        }
        return first;
    }

    private WhiskerStatusDto pingModel(PawhubProperties.Gemini g, String modelId) {
        String url = GENERATE_TEMPLATE.formatted(
                URLEncoder.encode(modelId, StandardCharsets.UTF_8),
                URLEncoder.encode(g.getApiKey(), StandardCharsets.UTF_8));
        String bodyJson;
        try {
            bodyJson = buildPingBody();
        } catch (Exception e) {
            return new WhiskerStatusDto(false, "Could not build health request.");
        }

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(25))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();
        try {
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                if (root.path("candidates").isArray() && !root.path("candidates").isEmpty()) {
                    return new WhiskerStatusDto(true, "Connected — Google AI responded for model " + modelId + ".");
                }
                return new WhiskerStatusDto(false, "Unexpected response from Google AI. Try again later.");
            }
            String human = describeGoogleError(resp.body(), resp.statusCode());
            log.debug("PawBot health check HTTP {} — {}", resp.statusCode(), abbreviate(resp.body(), 400));
            return new WhiskerStatusDto(false, human);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new WhiskerStatusDto(false, "Health check interrupted.");
        } catch (IOException e) {
            log.debug("PawBot health I/O: {}", e.getMessage());
            return new WhiskerStatusDto(
                    false, "Cannot reach Google AI. Check network, firewall, and API key. (" + e.getMessage() + ")");
        } catch (Exception e) {
            log.debug("PawBot health failed: {}", e.getMessage());
            return new WhiskerStatusDto(false, "Health check failed: " + abbreviate(e.getMessage(), 200));
        }
    }

    private String buildPingBody() throws Exception {
        Map<String, Object> part = Map.of("text", "Reply with the single word: ok");
        Map<String, Object> content = new LinkedHashMap<>();
        content.put("role", "user");
        content.put("parts", List.of(part));
        Map<String, Object> gen = new LinkedHashMap<>();
        gen.put("maxOutputTokens", 16);
        gen.put("temperature", 0);
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("contents", List.of(content));
        root.put("generationConfig", gen);
        return objectMapper.writeValueAsString(root);
    }

    private static String pickWhiskerModel(PawhubProperties.Gemini g) {
        String w = g.getWhiskerModel();
        if (w != null && !w.isBlank()) {
            return w.trim();
        }
        return primaryGeminiModel(g);
    }

    private static String primaryGeminiModel(PawhubProperties.Gemini g) {
        String primary = g.getModel() != null && !g.getModel().isBlank() ? g.getModel().trim() : GeminiModelIds.DEFAULT;
        return primary;
    }

    private static boolean looksLikeModelNotFound(String message) {
        if (message == null) {
            return false;
        }
        String m = message.toLowerCase();
        return m.contains("not found") || m.contains("404") || m.contains("not supported for generatecontent");
    }

    private String describeGoogleError(String body, int status) {
        if (body == null || body.isBlank()) {
            return status == 403
                    ? "API key was rejected (HTTP 403). Check Google AI Studio and PAWHUB_GEMINI_API_KEY."
                    : "Google AI error (HTTP " + status + ").";
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            String msg = root.path("error").path("message").asText("");
            if (!msg.isBlank()) {
                String lower = msg.toLowerCase();
                if (lower.contains("leaked") || lower.contains("reported as leaked")) {
                    return "This API key was revoked as leaked. Create a new key in Google AI Studio and update server config.";
                }
                if (lower.contains("permission_denied") || lower.contains("permission denied")) {
                    return "Permission denied — check that the API key is valid and billing/quotas in Google AI Studio.";
                }
                if (lower.contains("not found") && lower.contains("models/")) {
                    return "This Gemini model ID is not available for your key. Set pawhub.gemini.whisker-model to a model listed in AI Studio.";
                }
                if (lower.contains("resource_exhausted") || lower.contains("quota")) {
                    return "Quota or rate limit — try again later or switch model in pawhub.gemini.";
                }
                return msg.length() > 280 ? msg.substring(0, 280) + "…" : msg;
            }
        } catch (Exception ignored) {
        }
        return "Google AI error (HTTP " + status + "). Check API key and pawhub.gemini settings.";
    }

    private static String abbreviate(String s, int max) {
        if (s == null) {
            return "";
        }
        String t = s.replace('\n', ' ');
        return t.length() <= max ? t : t.substring(0, max) + "…";
    }
}
