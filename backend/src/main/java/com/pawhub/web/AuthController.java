package com.pawhub.web;

import com.pawhub.service.AuthService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.*;
import jakarta.validation.Valid;
<<<<<<< HEAD
import java.util.Map;
=======
import java.util.List;
>>>>>>> PawAdopt-PawVet
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public RegistrationResponse registerJson(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RegistrationResponse registerMultipart(
            @RequestPart("profile") @Valid RegisterRequest profile,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar,
            @RequestPart(value = "vetDocuments", required = false) List<MultipartFile> vetDocuments) {
        return authService.register(profile, avatar, vetDocuments);
    }

    @GetMapping("/verify-email")
    public VerifyEmailResponse verifyEmail(
            @RequestParam String token, @RequestParam(required = false) String email) {
        return authService.verifyEmail(token, email);
    }

    /** Returns whether the given email belongs to an account with verified email (for recovery UI). */
    @GetMapping("/email-verified")
    public Map<String, Boolean> emailVerified(@RequestParam String email) {
        return Map.of("verified", authService.isEmailVerifiedForAddress(email));
    }

    @PostMapping("/resend-verification")
    public Map<String, String> resendVerification(@Valid @RequestBody ResendVerificationRequest req) {
        authService.resendVerification(req);
        return Map.of(
                "message",
                "If an account exists for that email and it is not yet verified, we sent a new verification link.");
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public AuthResponse me(@AuthenticationPrincipal SecurityUser user) {
        return authService.me(user);
    }
}
