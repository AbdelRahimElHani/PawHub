package com.pawhub.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record WhiskerTitleRequest(
        @NotNull @Size(min = 1, max = 12) @Valid List<WhiskerMessage> messages) {}
