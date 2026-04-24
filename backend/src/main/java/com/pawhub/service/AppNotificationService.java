package com.pawhub.service;

import com.pawhub.domain.AppNotification;
import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.User;
import com.pawhub.domain.UserRole;
import com.pawhub.domain.VetLicenseApplication;
import com.pawhub.domain.VetVerificationStatus;
import com.pawhub.repository.AppNotificationRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.repository.VetLicenseApplicationRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AppNotificationDto;
import com.pawhub.web.dto.AppNotificationPushPayload;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AppNotificationService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_INSTANT;

    private final AppNotificationRepository appNotificationRepository;
    private final UserRepository userRepository;
    private final VetLicenseApplicationRepository vetLicenseApplicationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void publish(
            Long userId,
            AppNotificationKind kind,
            String title,
            String body,
            String deepLink,
            String iconKind,
            String avatarUrl) {
        if (userId == null) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        AppNotification row = AppNotification.builder()
                .user(user)
                .kind(kind)
                .title(trunc(title, 255))
                .body(body != null ? body : "")
                .readFlag(false)
                .deepLink(deepLink != null ? trunc(deepLink, 512) : "/")
                .iconKind(iconKind != null ? trunc(iconKind, 32) : mapIcon(kind))
                .avatarUrl(avatarUrl != null ? trunc(avatarUrl, 1024) : null)
                .build();
        appNotificationRepository.save(row);
    }

    /** Persist notification and STOMP-nudge that user (open sessions refresh the bell). */
    @Transactional
    public void publishWithInboxNudge(
            Long userId,
            AppNotificationKind kind,
            String title,
            String body,
            String deepLink,
            String iconKind,
            String avatarUrl) {
        publish(userId, kind, title, body, deepLink, iconKind, avatarUrl);
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            scheduleAppNotificationPushToEmails(List.of(user.getEmail()));
        }
    }

    @Transactional(readOnly = true)
    public List<AppNotificationDto> listFor(SecurityUser principal, int limit) {
        int cap = Math.min(Math.max(limit, 1), 100);
        return appNotificationRepository
                .findByUser_IdOrderByCreatedAtDesc(principal.getId(), PageRequest.of(0, cap))
                .stream()
                .map(AppNotificationService::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return appNotificationRepository.countByUser_IdAndReadFlagFalse(userId);
    }

    @Transactional
    public void markRead(SecurityUser principal, long id) {
        int n = appNotificationRepository.markRead(id, principal.getId());
        if (n == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found.");
        }
    }

    @Transactional
    public void markAllRead(SecurityUser principal) {
        appNotificationRepository.markAllReadForUser(principal.getId());
    }

    @Transactional
    public void delete(SecurityUser principal, long id) {
        int n = appNotificationRepository.deleteByIdAndUserId(id, principal.getId());
        if (n == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found.");
        }
    }

    private static AppNotificationDto toDto(AppNotification n) {
        return new AppNotificationDto(
                n.getId(),
                n.getKind().name(),
                n.getTitle(),
                n.getBody(),
                n.isReadFlag(),
                n.getDeepLink(),
                n.getIconKind(),
                n.getAvatarUrl(),
                ISO.format(n.getCreatedAt()));
    }

    private static String mapIcon(AppNotificationKind kind) {
        return switch (kind) {
            case ADMIN_SHELTER_REGISTERED,
                    ADMIN_SHELTER_DOSSIER_SUBMITTED,
                    SHELTER_VERIFIED,
                    ADOPTION_INQUIRY,
                    ADOPTION_LISTING_PUBLISHED,
                    ADOPTION_INQUIRY_SUBMITTED,
                    SHELTER_APPLICATION_REJECTED -> "shelter";
            case NEW_MESSAGE -> "message";
            case ADMIN_VET_LICENSE_SUBMITTED,
                    VET_LICENSE_VERIFIED,
                    VET_NEW_REVIEW,
                    PAWVET_NEW_TRIAGE_CASE -> "vet";
            case MARKET_ORDER_BUYER, MARKET_ORDER_SELLER, MARKET_LISTING_REMOVED_ADMIN -> "package";
            case FORUM_REPLY, FORUM_COMMENT_REPLY -> "forum";
            case FORUM_SCORE_MILESTONE -> "forum";
            case SYSTEM_ANNOUNCEMENT -> "system";
            case HEALTH_REMINDER -> "health";
        };
    }

    private static String trunc(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    /** Admin: PawHub-wide announcement (e.g. safety guide). */
    @Transactional
    public int broadcastSystemAnnouncement(String title, String body, String deepLink) {
        int n = 0;
        for (User u : userRepository.findAll()) {
            publish(u.getId(), AppNotificationKind.SYSTEM_ANNOUNCEMENT, title, body, deepLink, "system", null);
            n++;
        }
        return n;
    }

    /**
     * In-app notification for every admin user, plus a STOMP nudge (after DB commit) so open admin sessions
     * refresh the bell without a manual reload.
     */
    @Transactional
    public void publishToAdmins(AppNotificationKind kind, String title, String body, String deepLink) {
        List<User> admins = userRepository.findByRole(UserRole.ADMIN);
        if (admins.isEmpty()) {
            return;
        }
        List<String> emails = admins.stream().map(User::getEmail).toList();
        for (User admin : admins) {
            publish(admin.getId(), kind, title, body, deepLink, null, null);
        }
        scheduleAppNotificationPushToEmails(emails);
    }

    /**
     * Approved veterinarians (PawVet credentialing) — e.g. new triage case on the board.
     */
    @Transactional
    public void publishToApprovedVeterinarians(AppNotificationKind kind, String title, String body, String deepLink) {
        List<VetLicenseApplication> apps =
                vetLicenseApplicationRepository.findByStatusOrderByCreatedAtAsc(VetVerificationStatus.APPROVED);
        if (apps.isEmpty()) {
            return;
        }
        for (VetLicenseApplication app : apps) {
            User u = app.getUser();
            publish(u.getId(), kind, title, body, deepLink, null, null);
        }
        List<String> emails = apps.stream().map(a -> a.getUser().getEmail()).toList();
        scheduleAppNotificationPushToEmails(emails);
    }

    private void scheduleAppNotificationPushToEmails(List<String> emails) {
        if (emails == null || emails.isEmpty()) {
            return;
        }
        AppNotificationPushPayload payload = new AppNotificationPushPayload("REFRESH");
        Runnable push = () -> {
            for (String email : emails) {
                try {
                    messagingTemplate.convertAndSendToUser(email, "/queue/pawhub-app-notifications", payload);
                } catch (RuntimeException ignored) {
                    // Best-effort realtime; row is already persisted.
                }
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    push.run();
                }
            });
        } else {
            push.run();
        }
    }
}
