package com.pawhub.web.dto;

import jakarta.validation.constraints.Size;

public record RejectVetAppealRequest(@Size(max = 2000) String reason) {}
