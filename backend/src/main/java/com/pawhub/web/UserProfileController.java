package com.pawhub.web;

import com.pawhub.service.AuthService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AuthResponse;
import com.pawhub.web.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final AuthService authService;

    @PatchMapping("/me")
    public AuthResponse updateMe(@Valid @RequestBody UpdateProfileRequest req, @AuthenticationPrincipal SecurityUser user) {
        return authService.updateProfile(req, user);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AuthResponse uploadAvatar(@RequestPart("file") MultipartFile file, @AuthenticationPrincipal SecurityUser user) {
        return authService.updateAvatar(file, user);
    }
}
