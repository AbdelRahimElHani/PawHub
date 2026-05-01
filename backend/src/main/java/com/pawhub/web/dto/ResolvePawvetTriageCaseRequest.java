package com.pawhub.web.dto;

import jakarta.validation.constraints.Size;

/** Summary is optional; when blank the server stores a short default for the guardian. */
public record ResolvePawvetTriageCaseRequest(@Size(max = 12000) String summary) {}
