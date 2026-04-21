package com.pawhub.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawhub.config.GeminiModelIds;
import com.pawhub.config.PawhubProperties;
import com.pawhub.web.dto.CatVisionProfileDto;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Uses Gemini vision to infer coat colors, rough size, breed guess, and energy for 3D sanctuary presets.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CatVisionService {

    private static final String GEMINI_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}";

    private static final String VISION_PROMPT =
            """
            You analyze a single PHOTO for a "digital twin" of a domestic cat in a 3D app.

            Rules:
            - If the image does not clearly show a real domestic cat as the main subject, set isDomesticCat=false and still guess colors from fur if any cat is visible; otherwise use neutral defaults.
            - primaryCoatHex and secondaryCoatHex must be 7-char CSS hex like #RRGGBB (uppercase OK). Primary = dominant coat color; secondary = second most visible (paws/chest/face contrast). If unsure, pick plausible warm neutrals.
            - coatPattern: one of tabby, solid, bicolor, calico, tuxedo, pointed, spotted, longhair_silhouette, unknown
            - bodySize: small (kitten/small adult), medium (typical house cat), large (maine coon–sized or very chunky)
            - breedGuess: short English label or "Mixed" — best effort, may be wrong
            - activityLevel: integer 1 (very lazy) to 5 (very playful/alert) from pose and context
            - notes: one short sentence, user-facing
            """;

    private final PawhubProperties props;
    private final ObjectMapper objectMapper;

    public CatVisionProfileDto analyzePhoto(byte[] imageBytes, String mimeType) {
        if (!isEnabled()) {
            return CatVisionProfileDto.fallback("Gemini disabled — using default twin colors.");
        }
        if (imageBytes == null || imageBytes.length == 0) {
            return CatVisionProfileDto.fallback("No image.");
        }
        if (imageBytes.length > 7 * 1024 * 1024) {
            return CatVisionProfileDto.fallback("Image too large for analysis.");
        }

        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        String safeMime = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";

        Map<String, Object> imagePart = Map.of("inline_data", Map.of("mime_type", safeMime, "data", base64));
        Map<String, Object> textPart = Map.of("text", VISION_PROMPT);

        try {
            String raw = invokeGemini(List.of(imagePart, textPart));
            return parseResponse(raw);
        } catch (RestClientResponseException ex) {
            log.warn("Cat vision Gemini HTTP {}: {}", ex.getStatusCode().value(), ex.getMessage());
            if (props.getGemini().isFailOpenOnApiError()) {
                return CatVisionProfileDto.fallback("Vision API unavailable — using defaults.");
            }
            throw new IllegalStateException("Could not analyze photo: " + ex.getStatusCode());
        } catch (Exception ex) {
            log.warn("Cat vision failed: {}", ex.getMessage());
            if (props.getGemini().isFailOpenOnApiError()) {
                return CatVisionProfileDto.fallback("Vision analysis failed — using defaults.");
            }
            throw new IllegalStateException("Could not analyze photo.");
        }
    }

    private boolean isEnabled() {
        PawhubProperties.Gemini g = props.getGemini();
        return g.isEnabled() && g.getApiKey() != null && !g.getApiKey().isBlank();
    }

    private String invokeGemini(List<Map<String, Object>> parts) throws Exception {
        String primary = nonBlankModel(props.getGemini().getModel(), GeminiModelIds.DEFAULT);

        Map<String, Object> genConfig = new LinkedHashMap<>();
        genConfig.put("temperature", 0.15);
        genConfig.put("maxOutputTokens", 512);
        genConfig.put("responseMimeType", "application/json");
        genConfig.put("responseSchema", visionSchema());

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("contents", List.of(Map.of("parts", parts)));
        requestBody.put("generationConfig", genConfig);

        RestClient client = RestClient.create();
        return client.post()
                .uri(GEMINI_URL_TEMPLATE, primary, props.getGemini().getApiKey())
                .header("Content-Type", "application/json")
                .body(objectMapper.writeValueAsString(requestBody))
                .retrieve()
                .body(String.class);
    }

    private static String nonBlankModel(String model, String defaultId) {
        if (model == null || model.isBlank()) {
            return defaultId;
        }
        return model.trim();
    }

    private static Map<String, Object> visionSchema() {
        Map<String, Object> str = Map.of("type", "STRING");
        Map<String, Object> bool = Map.of("type", "BOOLEAN");
        Map<String, Object> intT = Map.of("type", "INTEGER");
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("isDomesticCat", bool);
        props.put("primaryCoatHex", str);
        props.put("secondaryCoatHex", str);
        props.put("coatPattern", str);
        props.put("bodySize", str);
        props.put("breedGuess", str);
        props.put("activityLevel", intT);
        props.put("notes", str);
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "OBJECT");
        schema.put(
                "properties",
                props);
        schema.put(
                "required",
                List.of(
                        "isDomesticCat",
                        "primaryCoatHex",
                        "secondaryCoatHex",
                        "coatPattern",
                        "bodySize",
                        "breedGuess",
                        "activityLevel",
                        "notes"));
        return schema;
    }

    private CatVisionProfileDto parseResponse(String raw) throws Exception {
        JsonNode root = objectMapper.readTree(raw);
        JsonNode blockReason = root.path("promptFeedback").path("blockReason");
        if (!blockReason.isMissingNode() && !blockReason.asText("").isBlank()) {
            return CatVisionProfileDto.fallback("Vision blocked by safety filters.");
        }
        JsonNode first = root.path("candidates").path(0);
        String finish = first.path("finishReason").asText("");
        if ("SAFETY".equalsIgnoreCase(finish) || "BLOCKLIST".equalsIgnoreCase(finish)) {
            return CatVisionProfileDto.fallback("Image blocked by safety filters.");
        }
        String text = extractText(first.path("content").path("parts"));
        if (text.isBlank()) {
            return CatVisionProfileDto.fallback("Empty model response.");
        }
        JsonNode j = objectMapper.readTree(AiCatCheckService.stripJsonFence(text.trim()));
        boolean isCat = j.path("isDomesticCat").asBoolean(true);
        String p1 = normalizeHex(j.path("primaryCoatHex").asText("#94a3b8"));
        String p2 = normalizeHex(j.path("secondaryCoatHex").asText("#f4b942"));
        String pattern = j.path("coatPattern").asText("unknown");
        String size = normalizeSize(j.path("bodySize").asText("medium"));
        String breed = null;
        JsonNode bg = j.get("breedGuess");
        if (bg != null && !bg.isNull() && bg.isTextual()) {
            String t = bg.asText().trim();
            if (!t.isEmpty()) {
                breed = t;
            }
        }
        int energy = j.path("activityLevel").asInt(3);
        energy = Math.min(5, Math.max(1, energy));
        String notes = j.path("notes").asText("");

        return new CatVisionProfileDto(isCat, p1, p2, pattern, size, breed, energy, notes, "gemini");
    }

    private static String normalizeHex(String h) {
        if (h == null || h.length() < 4) {
            return "#94a3b8";
        }
        String t = h.trim();
        if (!t.startsWith("#")) {
            t = "#" + t;
        }
        if (t.length() == 4) {
            // #RGB -> #RRGGBB
            return "#" + t.charAt(1) + t.charAt(1) + t.charAt(2) + t.charAt(2) + t.charAt(3) + t.charAt(3);
        }
        return t.length() == 7 ? t : "#94a3b8";
    }

    private static String normalizeSize(String s) {
        if (s == null) return "medium";
        String x = s.toLowerCase().trim();
        if (x.contains("small") || x.contains("kitten")) return "small";
        if (x.contains("large") || x.contains("big")) return "large";
        return "medium";
    }

    private static String extractText(JsonNode parts) {
        if (!parts.isArray()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (JsonNode p : parts) {
            String t = p.path("text").asText("");
            if (!t.isBlank()) {
                if (sb.length() > 0) sb.append('\n');
                sb.append(t);
            }
        }
        return sb.toString().trim();
    }
}
