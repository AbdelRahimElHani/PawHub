package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.AppNotificationService;
import com.pawhub.web.dto.AppNotificationDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final AppNotificationService appNotificationService;

    @GetMapping
    public List<AppNotificationDto> list(
            @RequestParam(defaultValue = "50") int limit, @AuthenticationPrincipal SecurityUser user) {
        return appNotificationService.listFor(user, limit);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal SecurityUser user) {
        return new UnreadCountResponse(appNotificationService.unreadCount(user.getId()));
    }

    @PostMapping("/{id}/read")
    public void markRead(@PathVariable long id, @AuthenticationPrincipal SecurityUser user) {
        appNotificationService.markRead(user, id);
    }

    @PostMapping("/read-all")
    public void markAllRead(@AuthenticationPrincipal SecurityUser user) {
        appNotificationService.markAllRead(user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id, @AuthenticationPrincipal SecurityUser user) {
        appNotificationService.delete(user, id);
    }

    public record UnreadCountResponse(long count) {}
}
