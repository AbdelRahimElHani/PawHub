package com.pawhub.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pawhub.config.GeminiModelIds;
import com.pawhub.config.PawhubProperties;
import com.pawhub.web.dto.CatCheckResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Image moderation via Gemini. When disabled or no API key, checks are skipped (pass).
 *
 * <p>If every listing fails Cat-Check, typical causes are: wrong {@code pawhub.gemini.model}
 * (404), invalid API key, or quota errors — see server logs. Use {@code fail-open-on-api-error}
 * only while debugging; set it {@code false} once the API responds with HTTP 200.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiCatCheckService {

    private static final String GEMINI_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}";

    /**
     * isCatRelated in the JSON output means the listing is APPROVED: image, title, and description
     * must all be consistent with each other and with a cat-only marketplace.
     */
    private static final String IMAGE_PROMPT =
            """
            You are the final reviewer for a cat-only C2C marketplace (Paw Market).

            You receive: (1) a product PHOTO, (2) a TITLE, (3) a DESCRIPTION (may be empty).

            Set isCatRelated=true ONLY if ALL of the following hold:

            A) IMAGE — The photo clearly shows cat-specific merchandise or supplies (food/treats, toys,
               beds/trees/scratchers, litter/boxes, carriers, cat collars/harnesses, grooming/health
               products for cats, or packaging clearly for cats). Reject blank paper, random objects,
               unrelated rooms, dogs-only, human-only, cars, landscapes, etc.

            B) TITLE — Must be about cats or cat products (not dogs-only, humans, generic junk).
               The title must honestly describe what is visible in the photo (same product type and
               brand level of specificity). Minor wording differences are OK; bait-and-switch is NOT
               (e.g. photo is a dog bowl but title says "cat tree").

            C) DESCRIPTION — If non-empty, it must agree with the image and title (same item, cat
               context). It must not contradict the photo or claim features not visible. If the
               description is empty, judge only image + title for alignment.

            D) TITLE vs DESCRIPTION — They must not contradict each other; both must plausibly refer
               to the same listing and the same cat-related item suggested by the image.

            Set isCatRelated=false if any of A–D fails. In "reason", name the first failed rule in
            short form (e.g. "Image is not cat merchandise", "Title does not match the photo",
               "Description contradicts the image", "Title and description disagree").

            TITLE: "%s"
            DESCRIPTION: "%s"
            """;

    /**
     * First-step check: image only. Used on photo upload. Does not consider title or description.
     */
    private static final String IMAGE_ONLY_PROMPT =
            """
            You are screening a product PHOTO for a cat-only C2C marketplace (Paw Market).

            Set isCatRelated=true ONLY if the image clearly shows cat-specific merchandise or supplies
            (food/treats, toys, beds/trees/scratchers, litter/boxes, carriers, cat collars/harnesses,
            grooming/health products for cats, or packaging clearly for cats).

            Set isCatRelated=false for: blank or unreadable images, random objects, unrelated rooms,
            dogs-only products, people-only, cars, landscapes, or anything that is not plausibly a
            cat-related item for sale.

            In "reason" give a short human-readable note.
            """;

    private static final Pattern IS_CAT =
            Pattern.compile("\"isCatRelated\"\\s*:\\s*(true|false)", Pattern.CASE_INSENSITIVE);
    private static final Pattern REASON =
            Pattern.compile("\"reason\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"", Pattern.DOTALL);

    private final PawhubProperties props;
    private final ObjectMapper objectMapper;

    public boolean isCatCheckEnabled() {
        return isEnabled();
    }

    /**
     * First step: whether the image alone is acceptable cat-related product photography. Used when
     * uploading a photo; title/description are not considered.
     */
    public CatCheckResponse verifyImageCatOnly(byte[] imageBytes, String mimeType) {
        return verifyWithTextPrompt(IMAGE_ONLY_PROMPT, imageBytes, mimeType);
    }

    /**
     * Second step: image + title + description must match (no bait-and-switch). Used at publish and
     * when editing a live listing’s text.
     */
    public CatCheckResponse verifyListingTextMatchesImage(
            byte[] imageBytes, String mimeType, String title, String description) {
        String prompt = IMAGE_PROMPT.formatted(
                title != null ? title : "", description != null ? description : "");
        return verifyWithTextPrompt(prompt, imageBytes, mimeType);
    }

    /**
     * @deprecated use {@link #verifyListingTextMatchesImage} (same behavior)
     */
    @Deprecated
    public CatCheckResponse verifyImage(
            byte[] imageBytes, String mimeType, String title, String description) {
        return verifyListingTextMatchesImage(imageBytes, mimeType, title, description);
    }

    private CatCheckResponse verifyWithTextPrompt(String prompt, byte[] imageBytes, String mimeType) {
        if (!isEnabled()) {
            return new CatCheckResponse(true, "AI verification skipped — Gemini is disabled or has no API key.");
        }

        if (imageBytes == null || imageBytes.length == 0) {
            return new CatCheckResponse(false, "No image data was sent.");
        }

        if (imageBytes.length > 7 * 1024 * 1024) {
            return new CatCheckResponse(false, "Image is too large. Try a photo under about 7 MB.");
        }

        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        String safeMime = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";

        Map<String, Object> imagePart = Map.of(
                "inline_data", Map.of("mime_type", safeMime, "data", base64));
        Map<String, Object> textPart = Map.of("text", prompt);

        return callGeminiForImage(List.of(imagePart, textPart));
    }

    private boolean isEnabled() {
        PawhubProperties.Gemini g = props.getGemini();
        return g.isEnabled() && g.getApiKey() != null && !g.getApiKey().isBlank();
    }

    private boolean failOpenOnApiError() {
        return props.getGemini().isFailOpenOnApiError();
    }

    private CatCheckResponse callGeminiForImage(List<Map<String, Object>> parts) {
        String primary = nonBlankModel(props.getGemini().getModel(), GeminiModelIds.DEFAULT);
        String fallback = nonBlankModel(props.getGemini().getFallbackModel(), GeminiModelIds.FALLBACK_ON_429);

        try {
            String raw = invokeGeminiGenerateContent(parts, primary);
            return parseGeminiGenerateContentResponse(raw);
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 429
                    && !fallback.isEmpty()
                    && !fallback.equalsIgnoreCase(primary)) {
                log.warn("Gemini HTTP 429 for model {} — retrying once with fallback {}", primary, fallback);
                try {
                    String raw2 = invokeGeminiGenerateContent(parts, fallback);
                    return parseGeminiGenerateContentResponse(raw2);
                } catch (RestClientResponseException ex2) {
                    return handleGeminiHttpError(ex2);
                } catch (Exception e2) {
                    log.warn("Gemini fallback call failed: {}", e2.getMessage());
                    return handleGeminiHttpError(ex);
                }
            }
            return handleGeminiHttpError(ex);
        } catch (Exception ex) {
            log.warn("Gemini image check failed: {}", ex.getMessage(), ex);
            if (failOpenOnApiError()) {
                return new CatCheckResponse(
                        true,
                        "Cat-Check skipped (could not reach Gemini). Check network and pawhub.gemini settings.");
            }
            return new CatCheckResponse(
                    false,
                    "We could not verify this image right now. Try again or fix Gemini configuration.");
        }
    }

    private static String nonBlankModel(String model, String defaultId) {
        if (model == null || model.isBlank()) {
            return defaultId;
        }
        return model.trim();
    }

    private String invokeGeminiGenerateContent(List<Map<String, Object>> parts, String modelId)
            throws Exception {

        Map<String, Object> genConfig = new LinkedHashMap<>();
        genConfig.put("temperature", 0);
        genConfig.put("maxOutputTokens", 512);
        genConfig.put("responseMimeType", "application/json");
        genConfig.put("responseSchema", catVerdictSchema());

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("contents", List.of(Map.of("parts", parts)));
        requestBody.put("generationConfig", genConfig);

        RestClient client = RestClient.create();
        return client.post()
                .uri(GEMINI_URL_TEMPLATE, modelId, props.getGemini().getApiKey())
                .header("Content-Type", "application/json")
                .body(objectMapper.writeValueAsString(requestBody))
                .retrieve()
                .body(String.class);
    }

    private CatCheckResponse handleGeminiHttpError(RestClientResponseException ex) {
        String body = ex.getResponseBodyAsString(StandardCharsets.UTF_8);
        String googleMsg = extractGoogleErrorMessage(body);
        int status = ex.getStatusCode().value();
        if (status == 429) {
            log.warn(
                    "Gemini HTTP 429 (quota / rate limit) — {} — snippet: {}",
                    abbreviate(googleMsg, 320),
                    abbreviate(body, 400));
        } else {
            log.warn(
                    "Gemini HTTP {} — {} — snippet: {}",
                    status,
                    googleMsg,
                    abbreviate(body, 400));
        }
        if (failOpenOnApiError()) {
            String hint = status == 429
                    ? " Quota or rate limit: enable billing in Google AI Studio, wait for reset, switch pawhub.gemini.model, or set fallback-model."
                    : " Check pawhub.gemini.model and api-key.";
            return new CatCheckResponse(
                    true,
                    "Cat-Check skipped (Gemini API error: " + abbreviate(googleMsg, 400) + ")." + hint);
        }
        return new CatCheckResponse(
                false,
                "Gemini rejected the request: "
                        + abbreviate(googleMsg, 500)
                        + " Fix configuration or set fail-open-on-api-error for local dev.");
    }

    private static Map<String, Object> catVerdictSchema() {
        Map<String, Object> reason = Map.of("type", "STRING");
        Map<String, Object> flag = Map.of("type", "BOOLEAN");
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "OBJECT");
        schema.put(
                "properties",
                Map.of(
                        "isCatRelated", flag,
                        "reason", reason));
        schema.put("required", List.of("isCatRelated", "reason"));
        return schema;
    }

    private CatCheckResponse parseGeminiGenerateContentResponse(String raw) throws Exception {
        JsonNode root = objectMapper.readTree(raw);

        JsonNode blockReason = root.path("promptFeedback").path("blockReason");
        if (!blockReason.isMissingNode() && !blockReason.asText("").isBlank()) {
            log.warn("Gemini promptFeedback.blockReason={} raw={}", blockReason.asText(), abbreviate(raw, 500));
            return new CatCheckResponse(false, "Prompt blocked by Gemini: " + blockReason.asText());
        }

        if (!root.path("candidates").isArray() || root.path("candidates").isEmpty()) {
            log.warn("Gemini returned no candidates: {}", abbreviate(raw, 800));
            if (failOpenOnApiError()) {
                return new CatCheckResponse(true, "Cat-Check skipped (empty model response). Check logs / model id.");
            }
            return new CatCheckResponse(false, "Could not verify this image (no model response). Try another photo.");
        }

        JsonNode first = root.path("candidates").path(0);
        String finish = first.path("finishReason").asText("");
        // Only hard-stop when Gemini gives no usable output; other finish reasons may still include JSON.
        if ("SAFETY".equalsIgnoreCase(finish) || "BLOCKLIST".equalsIgnoreCase(finish)) {
            return new CatCheckResponse(false, "This image was blocked by safety filters (" + finish + ").");
        }

        String combinedText = extractAllTextParts(first.path("content").path("parts"));
        if (combinedText.isBlank()) {
            log.warn("Gemini empty text parts: {}", abbreviate(raw, 800));
            if (failOpenOnApiError()) {
                return new CatCheckResponse(true, "Cat-Check skipped (no text in model output).");
            }
            return new CatCheckResponse(false, "Could not read the model response. Try again.");
        }

        JsonNode result = tryParseVerdictJson(combinedText);
        if (result == null) {
            log.warn("Could not parse verdict JSON from: {}", abbreviate(combinedText, 500));
            if (failOpenOnApiError()) {
                return new CatCheckResponse(true, "Cat-Check skipped (invalid JSON from model).");
            }
            return new CatCheckResponse(false, "Invalid verification response. Try again.");
        }

        if (!result.has("isCatRelated")) {
            if (failOpenOnApiError()) {
                return new CatCheckResponse(true, "Cat-Check skipped (missing isCatRelated in JSON).");
            }
            return new CatCheckResponse(false, "Invalid verification response. Try again.");
        }

        boolean isCatRelated = result.path("isCatRelated").asBoolean(false);
        String reason = result.path("reason").asText("No reason provided.");

        log.info("Gemini Cat-Check (image) → isCatRelated={} reason={}", isCatRelated, reason);
        return new CatCheckResponse(isCatRelated, reason);
    }

    private static String extractAllTextParts(JsonNode parts) {
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

    /** Try Jackson parse, then regex fallback for slightly malformed output. */
    private JsonNode tryParseVerdictJson(String text) {
        String cleaned = stripJsonFence(text.trim());
        try {
            return objectMapper.readTree(cleaned);
        } catch (Exception ignored) {
            // fall through
        }
        Matcher isCat = IS_CAT.matcher(cleaned);
        Matcher reasonM = REASON.matcher(cleaned);
        if (isCat.find() && reasonM.find()) {
            boolean b = Boolean.parseBoolean(isCat.group(1));
            String r = unescapeJsonString(reasonM.group(1));
            ObjectNode o = objectMapper.createObjectNode();
            o.put("isCatRelated", b);
            o.put("reason", r);
            return o;
        }
        return null;
    }

    private static String unescapeJsonString(String s) {
        return s.replace("\\\"", "\"")
                .replace("\\\\", "\\")
                .replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace("\\t", "\t");
    }

    static String stripJsonFence(String text) {
        if (text.startsWith("```")) {
            int nl = text.indexOf('\n');
            if (nl > 0) {
                text = text.substring(nl + 1);
            }
            int end = text.lastIndexOf("```");
            if (end > 0) {
                text = text.substring(0, end);
            }
        }
        return text.trim();
    }

    private String extractGoogleErrorMessage(String body) {
        if (body == null || body.isBlank()) {
            return "(no body)";
        }
        try {
            JsonNode n = objectMapper.readTree(body);
            String msg = n.path("error").path("message").asText("");
            if (!msg.isBlank()) {
                return msg;
            }
        } catch (Exception ignored) {
            // fall through
        }
        return abbreviate(body, 200);
    }

    private static String abbreviate(String s, int max) {
        if (s == null) {
            return "";
        }
        String t = s.replace("\n", " ").trim();
        return t.length() <= max ? t : t.substring(0, max) + "…";
    }

    public static class CatCheckFailedException extends RuntimeException {
        public CatCheckFailedException(String reason) {
            super(reason);
        }
    }
}
