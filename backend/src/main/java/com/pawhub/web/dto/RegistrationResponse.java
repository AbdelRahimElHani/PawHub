package com.pawhub.web.dto;

/** Returned from {@code POST /api/auth/register} — no JWT until email is verified. */
public record RegistrationResponse(String message, String email, boolean verificationRequired) {}
