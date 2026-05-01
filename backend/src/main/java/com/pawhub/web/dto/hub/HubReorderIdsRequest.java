package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record HubReorderIdsRequest(@NotEmpty List<String> orderedIds) {}
