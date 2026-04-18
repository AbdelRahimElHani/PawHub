package com.pawhub.web.dto;

public record CatCardDto(
        Long id,
        String name,
        String breed,
        Integer ageMonths,
        String bio,
        String coverPhotoUrl,
        String ownerDisplayName) {}
