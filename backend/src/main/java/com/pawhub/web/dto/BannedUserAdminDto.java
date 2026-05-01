package com.pawhub.web.dto;

/** Admin view of accounts restricted on Paw Market and/or Paw Adopt. */
public record BannedUserAdminDto(
        long userId,
        String email,
        String displayName,
        String accountType,
        String role,
        boolean pawMarketBanned,
        boolean pawAdoptBanned) {}
