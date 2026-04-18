package com.pawhub.bootstrap;

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

    @Override
    public void run(ApplicationArguments args) {
        if (!userRepository.existsByEmailIgnoreCase("admin@pawhub.local")) {
            User admin = User.builder()
                    .email("admin@pawhub.local")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .displayName("PawHub Admin")
                    .accountType(UserAccountType.ADOPTER)
                    .role(UserRole.ADMIN)
                    .build();
            userRepository.save(admin);
        }
    }
}
