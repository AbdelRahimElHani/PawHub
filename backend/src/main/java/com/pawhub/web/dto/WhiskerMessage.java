package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record WhiskerMessage(
        @NotBlank @Pattern(regexp = "(?i)(user|assistant|model)") String role,
        @NotBlank @Size(max = 8000) String content) {

    public String geminiRole() {
        String r = role == null ? "" : role.toLowerCase();
        return "user".equals(r) ? "user" : "model";
    }
}
