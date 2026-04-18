package com.pawhub.web;

import com.pawhub.service.AuthService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AuthResponse;
import com.pawhub.web.dto.LoginRequest;
import com.pawhub.web.dto.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AuthResponse registerJson(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AuthResponse registerMultipart(
            @RequestPart("profile") @Valid RegisterRequest profile,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        return authService.register(profile, avatar);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/me")
    public AuthResponse me(@AuthenticationPrincipal SecurityUser user) {
        return authService.me(user);
    }
}
