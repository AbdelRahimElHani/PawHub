package com.pawhub.web.dto;

import jakarta.validation.constraints.NotNull;

public record FriendActionRequest(@NotNull Long otherUserId) {}
