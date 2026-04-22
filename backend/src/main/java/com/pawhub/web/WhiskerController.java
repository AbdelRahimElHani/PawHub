package com.pawhub.web;

import com.pawhub.service.WhiskerChatService;
import com.pawhub.service.WhiskerHealthService;
import com.pawhub.web.dto.WhiskerChatRequest;
import com.pawhub.web.dto.WhiskerStatusDto;
import com.pawhub.web.dto.WhiskerTitleRequest;
import com.pawhub.web.dto.WhiskerTitleResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
public class WhiskerController {

    private final WhiskerChatService whiskerChatService;
    private final WhiskerHealthService whiskerHealthService;

    /** Live check: API key + configured PawBot model respond to a minimal generateContent request. */
    @GetMapping("/api/chat/status")
    public WhiskerStatusDto status() {
        return whiskerHealthService.check();
    }

    /** Short thread title from recent messages (Gemini). */
    @PostMapping("/api/chat/title")
    public WhiskerTitleResponse suggestTitle(@Valid @RequestBody WhiskerTitleRequest request) {
        String title = whiskerChatService.suggestTitle(request.messages());
        return new WhiskerTitleResponse(title);
    }

    /**
     * Writes the stream on the request thread (no {@code StreamingResponseBody} async dispatch), so Spring
     * Security does not re-run authorization mid-response after the body is committed.
     */
    @PostMapping(value = "/api/chat/stream", produces = "application/x-ndjson")
    public void stream(@Valid @RequestBody WhiskerChatRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/x-ndjson");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        try {
            whiskerChatService.streamChat(request, response.getOutputStream());
        } catch (IOException e) {
            log.warn("PawBot stream failed while writing response: {}", e.getMessage());
            throw e;
        }
    }
}
