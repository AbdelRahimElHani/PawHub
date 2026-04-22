package com.pawhub.bootstrap;

import com.pawhub.config.PawhubProperties;
import com.pawhub.domain.User;
import com.pawhub.domain.UserAccountType;
import com.pawhub.domain.UserRole;
import com.pawhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminSeedRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PawhubProperties pawhubProperties;

    @Override
    public void run(ApplicationArguments args) {
        PawhubProperties.Admin cfg = pawhubProperties.getAdmin();
        String email = cfg.getEmail() == null ? "" : cfg.getEmail().trim().toLowerCase();
        String password = cfg.getPassword();
        if (email.isBlank() || password == null || password.isBlank()) {
            return;
        }

        userRepository
                .findByEmailIgnoreCase(email)
                .ifPresentOrElse(
                        existing -> {
                            if (cfg.isSyncCredentialsOnStartup()) {
                                existing.setPasswordHash(passwordEncoder.encode(password));
                                existing.setRole(UserRole.ADMIN);
                                existing.setEmailVerified(true);
                                userRepository.save(existing);
                            }
                        },
                        () -> {
                            User admin = User.builder()
                                    .email(email)
                                    .passwordHash(passwordEncoder.encode(password))
                                    .displayName("PawHub Admin")
                                    .accountType(UserAccountType.ADOPTER)
                                    .role(UserRole.ADMIN)
                                    .emailVerified(true)
                                    .build();
                            userRepository.save(admin);
                        });
    }
}
