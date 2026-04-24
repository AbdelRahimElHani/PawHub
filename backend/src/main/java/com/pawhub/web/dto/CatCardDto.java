package com.pawhub.web.dto;

public record CatCardDto(
        Long id,
        String name,
        String breed,
        Integer ageMonths,
        String gender,
        String bio,
        String behavior,
        String coverPhotoUrl,
        String ownerDisplayName,
        Long ownerUserId) {}
