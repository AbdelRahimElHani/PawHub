package com.pawhub.bootstrap;

import com.pawhub.config.PawhubProperties;
import com.pawhub.domain.User;
import com.pawhub.domain.UserAccountType;
import com.pawhub.domain.UserRole;
import com.pawhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Inserts a regular user for local dev when {@link PawhubProperties.DemoUser} is enabled. Skips if the
 * email already exists.
 */
@Component
@Order(1)
@RequiredArgsConstructor
public class DemoUserSeedRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PawhubProperties pawhubProperties;

    @Override
    public void run(ApplicationArguments args) {
        PawhubProperties.DemoUser cfg = pawhubProperties.getDemoUser();
        if (!cfg.isEnabled()) {
            return;
        }
        String email = cfg.getEmail() == null ? "" : cfg.getEmail().trim().toLowerCase();
        String password = cfg.getPassword();
        String display = cfg.getDisplayName() == null ? "" : cfg.getDisplayName().trim();
        if (email.isBlank() || password == null || password.isBlank() || display.isBlank()) {
            return;
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }
        User demo = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .displayName(display)
                .accountType(UserAccountType.ADOPTER)
                .role(UserRole.USER)
                .emailVerified(true)
                .build();
        userRepository.save(demo);
    }
}
