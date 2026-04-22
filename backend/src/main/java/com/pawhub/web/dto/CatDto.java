package com.pawhub.web.dto;

import java.util.List;

public record CatDto(
        Long id,
        String name,
        String breed,
        Integer ageMonths,
        String gender,
        String bio,
        List<String> photoUrls,
        String prefLookingForGender,
        Integer prefMinAgeMonths,
        Integer prefMaxAgeMonths,
        String behavior,
        String prefBehavior,
        String prefBreed) {}
