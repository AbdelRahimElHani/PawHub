package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForumRoomCreateRequest(@NotBlank @Size(max = 255) String title, @NotBlank String description) {}
