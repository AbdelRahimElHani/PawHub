package com.pawhub.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawhub.domain.*;
import com.pawhub.repository.ShelterRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.repository.VetLicenseApplicationRepository;
import com.pawhub.security.JwtService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AuthResponse;
import com.pawhub.web.dto.LoginRequest;
import com.pawhub.web.dto.RegisterRequest;
import com.pawhub.web.dto.UpdateProfileRequest;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_VET_DOCUMENTS = 8;

    private final UserRepository userRepository;
    private final ShelterRepository shelterRepository;
    private final VetLicenseApplicationRepository vetLicenseApplicationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (req.accountType() == UserAccountType.VET) {
            throw new IllegalArgumentException(
                    "Veterinarian registration requires proving documents (PDF or images). Please use the signup form and attach at least one file.");
        }
        return registerInternal(req, null, List.of());
    }

    @Transactional
    public AuthResponse register(RegisterRequest req, MultipartFile avatar, List<MultipartFile> vetDocuments) {
        List<MultipartFile> docs = vetDocuments == null ? List.of() : vetDocuments;
        return registerInternal(req, avatar, docs);
    }

    private AuthResponse registerInternal(RegisterRequest req, MultipartFile avatar, List<MultipartFile> vetDocuments) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (req.accountType() == UserAccountType.SHELTER) {
            if (req.shelterOrgName() == null || req.shelterOrgName().isBlank()) {
                throw new IllegalArgumentException("Shelter organization name is required for shelter accounts");
            }
        }
        if (req.accountType() == UserAccountType.VET) {
            if (req.vetLicenseNumber() == null || req.vetLicenseNumber().isBlank()) {
                throw new IllegalArgumentException("License number is required for veterinarian accounts");
            }
            if (req.vetUniversity() == null || req.vetUniversity().isBlank()) {
                throw new IllegalArgumentException("University / DVM program is required for veterinarian accounts");
            }
            Integer y = req.vetYearsExperience();
            if (y != null && (y < 0 || y > 70)) {
                throw new IllegalArgumentException("Years of experience must be between 0 and 70");
            }
            List<MultipartFile> nonEmpty =
                    vetDocuments.stream().filter(f -> f != null && !f.isEmpty()).toList();
            if (nonEmpty.isEmpty()) {
                throw new IllegalArgumentException(
                        "Please upload at least one proving document (e.g. state license, diploma, or government ID) with your veterinarian application.");
            }
            if (nonEmpty.size() > MAX_VET_DOCUMENTS) {
                throw new IllegalArgumentException("At most " + MAX_VET_DOCUMENTS + " proving documents are allowed.");
            }
            for (MultipartFile f : nonEmpty) {
                if (!isAllowedVetDocumentMime(f)) {
                    throw new IllegalArgumentException(
                            "Unsupported file type for proving documents. Please use PDF or common image formats (JPEG, PNG, WebP).");
                }
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

        if (req.accountType() == UserAccountType.VET) {
            List<String> urls = new ArrayList<>();
            try {
                for (MultipartFile f : vetDocuments) {
                    if (f == null || f.isEmpty()) {
                        continue;
                    }
                    urls.add(fileStorageService.store(f, "vet-license"));
                }
            } catch (IOException e) {
                throw new RuntimeException("Could not save proving documents", e);
            }
            String jsonUrls;
            try {
                jsonUrls = objectMapper.writeValueAsString(urls);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Could not serialize document URLs", e);
            }
            VetLicenseApplication vapp = VetLicenseApplication.builder()
                    .user(user)
                    .licenseNumber(req.vetLicenseNumber().trim())
                    .university(req.vetUniversity().trim())
                    .yearsExperience(req.vetYearsExperience())
                    .phone(trimToNull(req.vetPhone()))
                    .professionalBio(trimToNull(req.vetProfessionalBio()))
                    .status(VetVerificationStatus.PENDING)
                    .supportingDocumentUrls(jsonUrls)
                    .build();
            vetLicenseApplicationRepository.save(vapp);
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return toAuthResponse(token, userRepository.getReferenceById(user.getId()));
    }

    private static boolean isAllowedVetDocumentMime(MultipartFile f) {
        String ct = f.getContentType();
        if (ct == null || ct.isBlank()) {
            return true;
        }
        String c = ct.toLowerCase();
        return c.startsWith("image/")
                || c.equals("application/pdf")
                || c.equals("application/x-pdf");
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

    private AuthResponse toAuthResponse(String token, User user) {
        String vetStatus = null;
        String vetReject = null;
        if (user.getAccountType() == UserAccountType.VET) {
            var opt = vetLicenseApplicationRepository.findByUser_Id(user.getId());
            if (opt.isPresent()) {
                var a = opt.get();
                vetStatus = a.getStatus().name();
                vetReject = a.getRejectionReason();
            } else {
                vetStatus = "PENDING";
            }
        }
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
                vetStatus,
                vetReject);
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
