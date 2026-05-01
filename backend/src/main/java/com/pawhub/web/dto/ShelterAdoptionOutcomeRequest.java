package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;

public record ShelterAdoptionOutcomeRequest(
        @NotBlank String decision) {}
