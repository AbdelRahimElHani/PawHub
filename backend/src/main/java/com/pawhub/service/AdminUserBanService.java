package com.pawhub.service;

import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.User;
import com.pawhub.domain.UserRole;
import com.pawhub.repository.UserRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.BannedUserAdminDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AdminUserBanService {

    private final UserRepository userRepository;
    private final AppNotificationService appNotificationService;

    @Transactional(readOnly = true)
    public List<BannedUserAdminDto> listMarketOrAdoptBanned() {
        return userRepository.findWithPawMarketOrAdoptBan().stream()
                .filter(u -> u.getRole() != UserRole.ADMIN)
                .map(u -> new BannedUserAdminDto(
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName(),
                        u.getAccountType().name(),
                        u.getRole().name(),
                        u.isPawMarketBanned(),
                        u.isPawAdoptBanned()))
                .toList();
    }

    @Transactional
    public void liftPawMarketBan(long userId, SecurityUser admin) {
        User u = requireTarget(userId, admin);
        if (!u.isPawMarketBanned()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This account is not banned from Paw Market.");
        }
        u.setPawMarketBanned(false);
        userRepository.save(u);
        appNotificationService.publishWithInboxNudge(
                u.getId(),
                AppNotificationKind.SYSTEM_ANNOUNCEMENT,
                "Paw Market restriction lifted",
                "A PawHub administrator removed your Paw Market restriction. You may list and buy again according to"
                        + " the usual rules.",
                "/market",
                "system",
                null);
    }

    @Transactional
    public void liftPawAdoptBan(long userId, SecurityUser admin) {
        User u = requireTarget(userId, admin);
        if (!u.isPawAdoptBanned()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This account is not banned from Paw Adopt listings.");
        }
        u.setPawAdoptBanned(false);
        userRepository.save(u);
        appNotificationService.publishWithInboxNudge(
                u.getId(),
                AppNotificationKind.SYSTEM_ANNOUNCEMENT,
                "Paw Adopt restriction lifted",
                "A PawHub administrator removed your Paw Adopt listing restriction. If your shelter is verified, you may"
                        + " publish adoption listings again.",
                "/adopt/shelter",
                "system",
                null);
    }

    private User requireTarget(long userId, SecurityUser admin) {
        if (admin.getId() != null && admin.getId() == userId) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use another admin account to lift your own ban.");
        }
        User u = userRepository.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (u.getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot change ban flags for administrator accounts.");
        }
        return u;
    }
}
