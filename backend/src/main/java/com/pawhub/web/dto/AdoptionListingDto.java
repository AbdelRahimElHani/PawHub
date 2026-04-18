package com.pawhub.web.dto;

public record AdoptionListingDto(
        Long id,
        Long shelterId,
        String title,
        String petName,
        String description,
        String breed,
        Integer ageMonths,
        String photoUrl,
        String status,
        String shelterName) {}
