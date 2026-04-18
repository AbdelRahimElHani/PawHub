package com.pawhub.web.dto;

import com.pawhub.domain.SwipeDirection;
import jakarta.validation.constraints.NotNull;

public record SwipeRequest(@NotNull Long myCatId, @NotNull Long targetCatId, @NotNull SwipeDirection direction) {}
