package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.NotNull;

public record ForumVoteRequest(@NotNull Integer value) {}
