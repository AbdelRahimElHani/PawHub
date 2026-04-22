package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectVetApplicationRequest(
        @NotBlank @Size(max = 4000) String reason) {}
