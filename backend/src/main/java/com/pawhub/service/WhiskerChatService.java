package com.pawhub.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pawhub.config.GeminiModelIds;
import com.pawhub.config.PawhubProperties;
import com.pawhub.web.dto.WhiskerChatRequest;
import com.pawhub.web.dto.WhiskerMessage;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhiskerChatService {

    private static final String STREAM_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse";

    private static final String GENERATE_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final String TITLE_SYSTEM =
            """
            You write short titles for PawHub's cat-care assistant (PawBot).
            Output exactly ONE line: the conversation title only.
            Use 3–8 words, sentence case, no quotes, no emoji, no period at the end.
            Summarize the main topic from the messages. If there is no real topic yet, output: New chat""";

    private static final String SYSTEM_INSTRUCTION =
            """
            You are PawBot, the official PawHub AI chatbot. You are warm, expert, and slightly witty.
            Your goal is to help people who care for cats with behavior, nutrition, and health tips, while always recommending a vet for emergencies.

            Knowledge source: PawBot is not fine-tuned on PawHub databases or user activity. Each reply uses Google Gemini with this system prompt: general cat-care knowledge comes from the model's training (knowledge cutoff and safety policies apply), and PawHub navigation comes only from the route list below. The prompt is edited in code when features ship; it is not automatically synced from the app. You have no access to private data; never invent prices, policies, approval rules, or bans; send users to the in-app pages below for authoritative details.

            PawHub product map (client-side routes — use these paths exactly):

            Core & account
            - Home dashboard (signed-in landing): /
            - Log in / register / email verification: /login, /register, /verify-email
            - Profile & settings: /account

            Cats & matching
            - My cats (profiles & photos): /cats and /cats/:catId
            - PawMatch (swipes): /pawmatch
            - Mutual matches: /matches

            Messaging & people
            - Messages: /messages and /messages/:threadId
            - People directory: /people
            - Public profile: /users/:userId

            PawMarket (supplies)
            - Browse: /market
            - Seller listings: /market/selling
            - New listing: /market/new
            - Listing: /market/:id — edit: /market/:id/edit

            PawAdopt (adoption)
            - Hub & browse: /adopt
            - Listing detail: /adopt/:id
            - Post / manage listings: /adopt/new, /adopt/my-listings
            - Shelter organization workspace: /adopt/shelter

            Learn (editorial & community)
            - Learn home: /hub
            - FAQs: /hub/faq
            - Editorial: /hub/editorial
            - Forum rooms: /hub/community/:roomSlug (default room often /hub/community/general)
            - Thread: /hub/community/:roomSlug/p/:postId — authors may still open removed threads from their notifications; do not invent moderation details.

            PawVet (triage — not emergency care)
            - Home: /pawvet
            - File a case: /pawvet/file-case
            - Case room: /pawvet/case/:caseId
            - Rate after consult: /pawvet/case/:caseId/rate

            Veterinarian workspace (approved vets)
            - Dashboard: /vet
            - Resolve case: /vet/case/:caseId/resolve

            Platform admin (ADMIN role only)
            Paw Adopt–related: shelter verification and adoption/market bans live here — not under PawVet.
            - /adopt/admin redirects to the shelter queue
            - Shelter applications: /adopt/admin/shelters and /adopt/admin/shelters/:shelterId
            - Banned sellers & shelters (Paw Market / Paw Adopt): /adopt/admin/banned-accounts
            PawVet–related (vet credentials & reports): all under /pawvet/admin
            - Vet license queue: /pawvet/admin/vet-verification (also /pawvet/admin)
            - Vet reviews: /pawvet/admin/vet-reviews
            - Guardian reports about vets: /pawvet/admin/pawvet-reports
            Legacy: /admin and many /admin/* URLs redirect to the routes above.

            Account types (signup): MEMBER, SHELTER, VET. Do not guess someone's role — suggest /account or in-app help.

            Keep answers concise and scannable (short bullets). For medical emergencies, urge immediate contact with a local vet or emergency clinic.
            """;

    private final PawhubProperties props;
    private final ObjectMapper objectMapper;

    public void streamChat(WhiskerChatRequest request, OutputStream rawOut) throws IOException {
        PawhubProperties.Gemini g = props.getGemini();
        if (!g.isEnabled() || g.getApiKey() == null || g.getApiKey().isBlank()) {
            writeError(rawOut, "PawBot is offline — configure pawhub.gemini in the API server.");
            return;
        }

        String bodyJson;
        try {
            bodyJson = buildRequestJson(request.messages());
        } catch (Exception e) {
            writeError(rawOut, "Invalid request.");
            return;
        }

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();

        String whiskerModelId = pickWhiskerModel(g);
        String backupModelId = primaryGeminiModel(g);

        try {
            HttpResponse<InputStream> resp = sendGeminiStream(client, g, whiskerModelId, bodyJson);
            if (resp.statusCode() == 404 && !whiskerModelId.equals(backupModelId)) {
                log.warn(
                        "PawBot model {} not found — retrying with {}",
                        whiskerModelId,
                        backupModelId);
                resp = sendGeminiStream(client, g, backupModelId, bodyJson);
            }
            if (resp.statusCode() != 200) {
                String err = readStreamAsString(resp.body());
                log.warn("PawBot Gemini HTTP {} — {}", resp.statusCode(), abbreviate(err, 500));
                writeError(rawOut, "The AI service returned an error. Try again in a moment.");
                return;
            }
            try (InputStream in = resp.body();
                    BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                Writer w = new OutputStreamWriter(rawOut, StandardCharsets.UTF_8);
                streamGeminiSseToNdjson(reader, w);
                w.flush();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            writeError(rawOut, "Request interrupted.");
        } catch (Exception e) {
            log.warn("PawBot stream failed: {}", e.getMessage());
            writeError(rawOut, "Could not reach the AI service.");
        }
    }

    /**
     * Non-streaming title for chat history: one short label from recent turns. Returns {@code null} if Gemini is
     * unavailable or the call fails.
     */
    public String suggestTitle(List<WhiskerMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return null;
        }
        PawhubProperties.Gemini g = props.getGemini();
        if (!g.isEnabled() || g.getApiKey() == null || g.getApiKey().isBlank()) {
            return null;
        }
        int from = Math.max(0, messages.size() - 12);
        List<WhiskerMessage> slice = new ArrayList<>();
        for (int i = from; i < messages.size(); i++) {
            WhiskerMessage m = messages.get(i);
            String c = m.content();
            if (c.length() > 2000) {
                c = c.substring(0, 2000);
            }
            slice.add(new WhiskerMessage(m.role(), c));
        }
        String bodyJson;
        try {
            bodyJson = buildTitleRequestJson(slice);
        } catch (Exception e) {
            log.debug("PawBot title: build JSON failed: {}", e.getMessage());
            return null;
        }

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        String whiskerModelId = pickWhiskerModel(g);
        String backupModelId = primaryGeminiModel(g);
        try {
            HttpResponse<String> resp = sendGenerateContent(client, g, whiskerModelId, bodyJson);
            if (resp.statusCode() == 404 && !whiskerModelId.equals(backupModelId)) {
                resp = sendGenerateContent(client, g, backupModelId, bodyJson);
            }
            if (resp.statusCode() != 200) {
                log.debug("PawBot title HTTP {} — {}", resp.statusCode(), abbreviate(resp.body(), 300));
                return null;
            }
            JsonNode root = objectMapper.readTree(resp.body());
            if (root.has("error")) {
                return null;
            }
            String text = extractFullCandidateText(root);
            return sanitizeTitle(text);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.debug("PawBot title failed: {}", e.getMessage());
            return null;
        }
    }

    private HttpResponse<String> sendGenerateContent(
            HttpClient client, PawhubProperties.Gemini g, String modelId, String bodyJson)
            throws IOException, InterruptedException {
        String url = GENERATE_TEMPLATE.formatted(
                URLEncoder.encode(modelId, StandardCharsets.UTF_8),
                URLEncoder.encode(g.getApiKey(), StandardCharsets.UTF_8));
        HttpRequest httpReq = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();
        return client.send(httpReq, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private String buildTitleRequestJson(List<WhiskerMessage> messages) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();

        ObjectNode sys = objectMapper.createObjectNode();
        ArrayNode sysParts = objectMapper.createArrayNode();
        sysParts.add(objectMapper.createObjectNode().put("text", TITLE_SYSTEM));
        sys.set("parts", sysParts);
        root.set("systemInstruction", sys);

        ArrayNode contents = objectMapper.createArrayNode();
        for (WhiskerMessage m : messages) {
            ObjectNode content = objectMapper.createObjectNode();
            content.put("role", m.geminiRole());
            ArrayNode parts = objectMapper.createArrayNode();
            parts.add(objectMapper.createObjectNode().put("text", m.content()));
            content.set("parts", parts);
            contents.add(content);
        }
        root.set("contents", contents);

        ObjectNode gen = objectMapper.createObjectNode();
        gen.put("temperature", 0.25);
        gen.put("maxOutputTokens", 64);
        root.set("generationConfig", gen);

        return objectMapper.writeValueAsString(root);
    }

    private static String sanitizeTitle(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim().replace('\n', ' ').replaceAll("\\s+", " ");
        t = t.replaceAll("^[\"'“”]+|[\"'“”]+$", "");
        if (t.isEmpty()) {
            return null;
        }
        if (t.length() > 80) {
            t = t.substring(0, 77) + "…";
        }
        return t;
    }

    private String extractFullCandidateText(JsonNode root) {
        JsonNode candidates = root.get("candidates");
        if (candidates == null || !candidates.isArray() || candidates.isEmpty()) {
            return "";
        }
        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (!parts.isArray()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (JsonNode p : parts) {
            if (p.has("text")) {
                sb.append(p.get("text").asText(""));
            }
        }
        return sb.toString();
    }

    private HttpResponse<InputStream> sendGeminiStream(
            HttpClient client, PawhubProperties.Gemini g, String modelId, String bodyJson)
            throws IOException, InterruptedException {

        String url = STREAM_TEMPLATE.formatted(
                URLEncoder.encode(modelId, StandardCharsets.UTF_8),
                URLEncoder.encode(g.getApiKey(), StandardCharsets.UTF_8));
        HttpRequest httpReq = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMinutes(3))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();
        return client.send(httpReq, HttpResponse.BodyHandlers.ofInputStream());
    }

    private String pickWhiskerModel(PawhubProperties.Gemini g) {
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

    private String buildRequestJson(List<WhiskerMessage> messages) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();

        ObjectNode sys = objectMapper.createObjectNode();
        ArrayNode sysParts = objectMapper.createArrayNode();
        sysParts.add(objectMapper.createObjectNode().put("text", SYSTEM_INSTRUCTION));
        sys.set("parts", sysParts);
        root.set("systemInstruction", sys);

        ArrayNode contents = objectMapper.createArrayNode();
        for (WhiskerMessage m : messages) {
            ObjectNode content = objectMapper.createObjectNode();
            content.put("role", m.geminiRole());
            ArrayNode parts = objectMapper.createArrayNode();
            parts.add(objectMapper.createObjectNode().put("text", m.content()));
            content.set("parts", parts);
            contents.add(content);
        }
        root.set("contents", contents);

        ObjectNode gen = objectMapper.createObjectNode();
        gen.put("temperature", 0.7);
        gen.put("maxOutputTokens", 2048);
        root.set("generationConfig", gen);

        return objectMapper.writeValueAsString(root);
    }

    /**
     * Reads Gemini {@code alt=sse} stream and writes NDJSON lines: {@code {"c":"delta"}} chunks, then {@code
     * {"done":true}}.
     */
    private void streamGeminiSseToNdjson(BufferedReader reader, Writer w) throws IOException {
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.isBlank()) {
                continue;
            }
            if (!line.startsWith("data: ")) {
                continue;
            }
            String payload = line.substring(6).trim();
            if ("[DONE]".equalsIgnoreCase(payload)) {
                break;
            }
            JsonNode root;
            try {
                root = objectMapper.readTree(payload);
            } catch (Exception e) {
                continue;
            }
            if (root.has("error")) {
                String msg = root.path("error").path("message").asText("Gemini error");
                w.write(objectMapper.writeValueAsString(java.util.Map.of("error", msg)));
                w.write("\n");
                w.flush();
                return;
            }
            String delta = extractTextDelta(root);
            if (!delta.isEmpty()) {
                w.write(objectMapper.writeValueAsString(java.util.Map.of("c", delta)));
                w.write("\n");
                w.flush();
            }
        }
        w.write(objectMapper.writeValueAsString(java.util.Map.of("done", true)));
        w.write("\n");
        w.flush();
    }

    /** Gemini streaming chunks usually carry incremental text in candidates[0].content.parts[*].text */
    private String extractTextDelta(JsonNode root) {
        JsonNode candidates = root.get("candidates");
        if (candidates == null || !candidates.isArray() || candidates.isEmpty()) {
            return "";
        }
        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (!parts.isArray()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (JsonNode p : parts) {
            if (p.has("text")) {
                sb.append(p.get("text").asText(""));
            }
        }
        return sb.toString();
    }

    private void writeError(OutputStream rawOut, String message) throws IOException {
        Writer w = new OutputStreamWriter(rawOut, StandardCharsets.UTF_8);
        w.write(objectMapper.writeValueAsString(java.util.Map.of("error", message)));
        w.write("\n");
        w.flush();
    }

    private static String readStreamAsString(InputStream in) throws IOException {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String ln;
            while ((ln = r.readLine()) != null) {
                sb.append(ln).append('\n');
            }
            return sb.toString();
        }
    }

    private static String abbreviate(String s, int max) {
        if (s == null) {
            return "";
        }
        String t = s.replace('\n', ' ');
        return t.length() <= max ? t : t.substring(0, max) + "…";
    }
}
