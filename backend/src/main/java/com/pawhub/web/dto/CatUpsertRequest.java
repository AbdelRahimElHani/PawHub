package com.pawhub.web.dto;

import com.pawhub.domain.CatBehavior;
import com.pawhub.domain.CatGender;
import com.pawhub.domain.MatchBehaviorPreference;
import com.pawhub.domain.MatchGenderPreference;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CatUpsertRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 255) String breed,
        Integer ageMonths,
        CatGender gender,
        @Size(max = 4000) String bio,
        MatchGenderPreference prefLookingForGender,
        @Min(0) @Max(600) Integer prefMinAgeMonths,
        @Min(0) @Max(600) Integer prefMaxAgeMonths,
        CatBehavior behavior,
        MatchBehaviorPreference prefBehavior,
        @Size(max = 255) String prefBreed) {}
