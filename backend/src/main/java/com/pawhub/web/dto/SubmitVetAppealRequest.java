package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmitVetAppealRequest(@NotBlank @Size(max = 8000) String message) {}
