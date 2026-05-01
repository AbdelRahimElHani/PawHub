package com.pawhub.web.dto;

import jakarta.validation.constraints.Size;

public record RejectShelterApplicationRequest(@Size(max = 4000) String reason) {}
