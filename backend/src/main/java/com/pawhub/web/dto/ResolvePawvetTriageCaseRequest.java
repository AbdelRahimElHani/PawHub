package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolvePawvetTriageCaseRequest(@NotBlank @Size(max = 12000) String summary) {}
