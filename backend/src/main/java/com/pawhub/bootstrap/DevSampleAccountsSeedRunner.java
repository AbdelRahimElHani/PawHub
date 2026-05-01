package com.pawhub.bootstrap;

import com.pawhub.config.PawhubProperties;
import com.pawhub.domain.*;
import com.pawhub.repository.ShelterRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.repository.VetLicenseApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Idempotent dev seeds: one {@link User} per {@link UserAccountType} (all {@link UserRole#USER}). Primary platform
 * admin remains {@link AdminSeedRunner} / {@link PawhubProperties.Admin}.
 */
@Component
@Order(2)
@RequiredArgsConstructor
public class DevSampleAccountsSeedRunner implements ApplicationRunner {

    private static final String VET_SEED_DOC_JSON = "[\"seed://dev-license-placeholder.pdf\"]";

    private final UserRepository userRepository;
    private final ShelterRepository shelterRepository;
    private final VetLicenseApplicationRepository vetLicenseApplicationRepository;
    private final PasswordEncoder passwordEncoder;
    private final PawhubProperties pawhubProperties;

    @Override
    public void run(ApplicationArguments args) {
        if (!pawhubProperties.getBootstrap().isDevSampleAccounts()) {
            return;
        }
        String password = pawhubProperties.getBootstrap().getDevSampleAccountsPassword();
        if (password == null || password.isBlank()) {
            return;
        }

        seedUserIfAbsent(
                "sample-adopter@pawhub.local",
                password,
                "Sample Adopter",
                UserAccountType.ADOPTER,
                UserRole.USER,
                null);
        seedUserIfAbsent(
                "sample-owner@pawhub.local",
                password,
                "Sample Cat Owner",
                UserAccountType.CAT_OWNER,
                UserRole.USER,
                null);
        seedUserIfAbsent(
                "sample-shelter@pawhub.local",
                password,
                "Sample Shelter Contact",
                UserAccountType.SHELTER,
                UserRole.USER,
                new ShelterExtra("Sample Seed Shelter"));
        seedUserIfAbsent(
                "sample-vet@pawhub.local",
                password,
                "Sample Veterinarian",
                UserAccountType.VET,
                UserRole.USER,
                new VetExtra("DEV-VET-SAMPLE-1"));
    }

    private void seedUserIfAbsent(
            String email,
            String rawPassword,
            String displayName,
            UserAccountType accountType,
            UserRole role,
            ExtraEntity extra) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }
        User user =
                User.builder()
                        .email(email.toLowerCase())
                        .passwordHash(passwordEncoder.encode(rawPassword))
                        .displayName(displayName)
                        .accountType(accountType)
                        .role(role)
                        .emailVerified(true)
                        .build();
        userRepository.save(user);

        if (extra instanceof ShelterExtra s) {
            Shelter shelter =
                    Shelter.builder()
                            .user(user)
                            .name(s.orgName())
                            .city("Seed City")
                            .status(ShelterStatus.PENDING)
                            .build();
            shelterRepository.save(shelter);
        } else if (extra instanceof VetExtra v) {
            VetLicenseApplication app =
                    VetLicenseApplication.builder()
                            .user(user)
                            .licenseNumber(v.licenseNumber())
                            .university("Seed Veterinary College")
                            .yearsExperience(5)
                            .status(VetVerificationStatus.PENDING)
                            .supportingDocumentUrls(VET_SEED_DOC_JSON)
                            .build();
            vetLicenseApplicationRepository.save(app);
        }
    }

    private sealed interface ExtraEntity permits ShelterExtra, VetExtra {}

    private record ShelterExtra(String orgName) implements ExtraEntity {}

    private record VetExtra(String licenseNumber) implements ExtraEntity {}

}
