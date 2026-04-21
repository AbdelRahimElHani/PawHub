package com.pawhub.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Gemini vision analysis for sanctuary 3D twin presets. When AI is off or fails, {@code source}
 * is {@code fallback} and colors/size use safe defaults.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CatVisionProfileDto(
        boolean isDomesticCat,
        String primaryCoatHex,
        String secondaryCoatHex,
        String coatPattern,
        String bodySize,
        String breedGuess,
        int activityLevel,
        String notes,
        String source) {

    public static CatVisionProfileDto fallback(String reason) {
        return new CatVisionProfileDto(
                true,
                "#94a3b8",
                "#f4b942",
                "unknown",
                "medium",
                null,
                3,
                reason,
                "fallback");
    }
}
