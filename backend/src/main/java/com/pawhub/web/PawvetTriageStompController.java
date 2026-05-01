package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.PawvetTriageCaseService;
import com.pawhub.web.dto.PawvetTriageTypingPayload;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class PawvetTriageStompController {

    private final PawvetTriageCaseService triageCaseService;

    @MessageMapping("/pawvet.triage.typing")
    public void typing(@Payload PawvetTriageTypingPayload payload, Principal principal) {
        if (!(principal instanceof SecurityUser user)) {
            return;
        }
        if (payload == null || payload.caseId() == null) {
            return;
        }
        boolean on = Boolean.TRUE.equals(payload.typing());
        triageCaseService.broadcastTyping(user, payload.caseId(), on);
    }
}
