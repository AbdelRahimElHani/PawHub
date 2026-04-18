package com.pawhub.web.dto;

public record ShelterDto(
        Long id,
        Long ownerUserId,
        String name,
        String city,
        String region,
        String phone,
        String emailContact,
        String bio,
        String status) {}
