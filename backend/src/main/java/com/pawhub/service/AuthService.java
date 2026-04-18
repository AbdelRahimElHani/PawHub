package com.pawhub.service;

import com.pawhub.domain.*;
import com.pawhub.repository.ShelterRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.security.JwtService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AuthResponse;
import com.pawhub.web.dto.LoginRequest;
import com.pawhub.web.dto.RegisterRequest;
import com.pawhub.web.dto.UpdateProfileRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ShelterRepository shelterRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final FileStorageService fileStorageService;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        return register(req, null);
    }

    @Transactional
    public AuthResponse register(RegisterRequest req, MultipartFile avatar) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (req.accountType() == UserAccountType.SHELTER) {
            if (req.shelterOrgName() == null || req.shelterOrgName().isBlank()) {
                throw new IllegalArgumentException("Shelter organization name is required for shelter accounts");
            }
        }

        User user = User.builder()
                .email(req.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.password()))
                .displayName(req.displayName().trim())
                .accountType(req.accountType())
                .profileCity(trimToNull(req.profileCity()))
                .profileRegion(trimToNull(req.profileRegion()))
                .profileBio(trimToNull(req.profileBio()))
                .role(UserRole.USER)
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

        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return toAuthResponse(token, userRepository.getReferenceById(user.getId()));
    }

    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.password()));
        User user = userRepository
                .findByEmailIgnoreCase(req.email().trim().toLowerCase())
                .orElseThrow();
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
                user.getProfileBio());
    }
}
