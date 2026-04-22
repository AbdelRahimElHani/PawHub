package com.pawhub.service;

import com.pawhub.config.PawhubProperties;
import com.pawhub.domain.*;
import com.pawhub.repository.ShelterRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.security.JwtService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.*;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ShelterRepository shelterRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final FileStorageService fileStorageService;
    private final EmailVerificationNotifier emailVerificationNotifier;
    private final PawhubProperties pawhubProperties;

    @Transactional
    public RegistrationResponse register(RegisterRequest req) {
        return register(req, null);
    }

    @Transactional
    public RegistrationResponse register(RegisterRequest req, MultipartFile avatar) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (req.accountType() == UserAccountType.SHELTER) {
            if (req.shelterOrgName() == null || req.shelterOrgName().isBlank()) {
                throw new IllegalArgumentException("Shelter organization name is required for shelter accounts");
            }
        }

        boolean autoVerify = pawhubProperties.getAuth().isAutoVerifyEmailOnRegistration();
        String rawToken = UUID.randomUUID().toString().replace("-", "");

        User user = User.builder()
                .email(req.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.password()))
                .displayName(req.displayName().trim())
                .accountType(req.accountType())
                .profileCity(trimToNull(req.profileCity()))
                .profileRegion(trimToNull(req.profileRegion()))
                .profileBio(trimToNull(req.profileBio()))
                .role(UserRole.USER)
                .emailVerified(autoVerify)
                .emailVerificationToken(autoVerify ? null : rawToken)
                .emailVerificationExpiresAt(autoVerify ? null : Instant.now().plus(48, ChronoUnit.HOURS))
                .build();

        if (avatar != null && !avatar.isEmpty()) {
            try {
                user.setAvatarUrl(fileStorageService.store(avatar, "user"));
            } catch (IOException e) {
                throw new RuntimeException("Could not save avatar", e);
            }
        }

        userRepository.save(user);

        if (req.accountType() == UserAccountType.SHELTER) {
            Shelter shelter = Shelter.builder()
                    .user(user)
                    .name(req.shelterOrgName().trim())
                    .city(trimToNull(req.shelterCity()))
                    .region(trimToNull(req.shelterRegion()))
                    .phone(trimToNull(req.shelterPhone()))
                    .emailContact(trimToNull(req.shelterEmailContact()))
                    .bio(trimToNull(req.shelterBio()))
                    .status(ShelterStatus.PENDING)
                    .build();
            shelterRepository.save(shelter);
        }

        if (!autoVerify) {
            String link = verificationLink(rawToken, user.getEmail());
            emailVerificationNotifier.sendVerificationEmail(user.getEmail(), user.getDisplayName(), link);
        }

        String msg = autoVerify
                ? "Account created. You can sign in now."
                : "Account created. Check your inbox to verify your email before signing in.";
        return new RegistrationResponse(msg, user.getEmail(), !autoVerify);
    }

    @Transactional
    public VerifyEmailResponse verifyEmail(String token, String emailHint) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Verification token is required");
        }
        String trimmed = token.trim();
        User u = userRepository.findByEmailVerificationToken(trimmed).orElse(null);
        if (u != null) {
            return completeEmailVerification(u);
        }
        // Token no longer in DB (already used) or unknown — e.g. React Strict Mode double request.
        if (emailHint != null && !emailHint.isBlank()) {
            User byEmail = userRepository.findByEmailIgnoreCase(emailHint.trim().toLowerCase()).orElse(null);
            if (byEmail != null && byEmail.isEmailVerified()) {
                return new VerifyEmailResponse("This email is already verified. You can sign in.", true);
            }
        }
        throw new IllegalArgumentException(
                "Invalid or expired verification link. Use “Resend verification” on the login page if you need a new link.");
    }

    private VerifyEmailResponse completeEmailVerification(User u) {
        if (u.isEmailVerified()) {
            return new VerifyEmailResponse("This email is already verified. You can sign in.", true);
        }
        if (u.getEmailVerificationExpiresAt() == null || Instant.now().isAfter(u.getEmailVerificationExpiresAt())) {
            throw new IllegalArgumentException("This verification link has expired. Use “Resend verification” on the login page.");
        }
        u.setEmailVerified(true);
        u.setEmailVerificationToken(null);
        u.setEmailVerificationExpiresAt(null);
        userRepository.save(u);
        return new VerifyEmailResponse("Your email is verified. You can sign in now.", true);
    }

    /**
     * Resend verification email. Does nothing if email is unknown or already verified (limits account enumeration).
     */
    @Transactional
    public void resendVerification(ResendVerificationRequest req) {
        String email = req.email().trim().toLowerCase();
        userRepository
                .findByEmailIgnoreCase(email)
                .filter(u -> !u.isEmailVerified())
                .ifPresent(u -> {
                    String rawToken = UUID.randomUUID().toString().replace("-", "");
                    u.setEmailVerificationToken(rawToken);
                    u.setEmailVerificationExpiresAt(Instant.now().plus(48, ChronoUnit.HOURS));
                    userRepository.save(u);
                    emailVerificationNotifier.sendVerificationEmail(
                            u.getEmail(), u.getDisplayName(), verificationLink(rawToken, u.getEmail()));
                });
    }

    /**
     * Public check for clients that need to recover a "success" UI when the token was already consumed
     * (e.g. duplicate requests) but the address is known.
     */
    public boolean isEmailVerifiedForAddress(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return userRepository
                .findByEmailIgnoreCase(email.trim().toLowerCase())
                .map(User::isEmailVerified)
                .orElse(false);
    }

    private String verificationLink(String rawToken, String email) {
        String base = pawhubProperties.getFrontendBaseUrl();
        if (base == null || base.isBlank()) {
            base = "http://localhost:5173";
        }
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String enc = URLEncoder.encode(
                email == null ? "" : email.trim().toLowerCase(), StandardCharsets.UTF_8);
        return base + "/verify-email?token=" + rawToken + "&email=" + enc;
    }

    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.password()));
        User user = userRepository
                .findByEmailIgnoreCase(req.email().trim().toLowerCase())
                .orElseThrow();
        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Please verify your email before signing in. Check your inbox or use “Resend verification” below.");
        }
        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return toAuthResponse(token, user);
    }

    public AuthResponse me(SecurityUser principal) {
        User u = userRepository.findById(principal.getId()).orElseThrow();
        String token = jwtService.generateToken(u.getId(), u.getEmail());
        return toAuthResponse(token, u);
    }

    @Transactional
    public AuthResponse updateProfile(UpdateProfileRequest req, SecurityUser principal) {
        User u = userRepository.findById(principal.getId()).orElseThrow();
        if (req.displayName() != null && !req.displayName().isBlank()) {
            u.setDisplayName(req.displayName().trim());
        }
        if (req.profileCity() != null) {
            u.setProfileCity(trimToNull(req.profileCity()));
        }
        if (req.profileRegion() != null) {
            u.setProfileRegion(trimToNull(req.profileRegion()));
        }
        if (req.profileBio() != null) {
            u.setProfileBio(trimToNull(req.profileBio()));
        }
        String token = jwtService.generateToken(u.getId(), u.getEmail());
        return toAuthResponse(token, u);
    }

    @Transactional
    public AuthResponse updateAvatar(MultipartFile file, SecurityUser principal) {
        User u = userRepository.findById(principal.getId()).orElseThrow();
        try {
            u.setAvatarUrl(fileStorageService.store(file, "user"));
        } catch (IOException e) {
            throw new RuntimeException("Could not save avatar", e);
        }
        String token = jwtService.generateToken(u.getId(), u.getEmail());
        return toAuthResponse(token, u);
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static AuthResponse toAuthResponse(String token, User user) {
        return new AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name(),
                user.getAccountType().name(),
                user.getAvatarUrl(),
                user.getProfileCity(),
                user.getProfileRegion(),
                user.getProfileBio(),
                user.isEmailVerified());
    }
}
