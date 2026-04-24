package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

public record CreatePawvetTriageCaseRequest(
        Long catId,
        @NotBlank @Size(max = 255) String catName,
        Map<String, Object> catSnapshot,
        @NotBlank @Size(max = 16000) String symptoms,
        @Size(max = 8000) String mediaDescription,
        @NotBlank @Pattern(regexp = "routine|soon|urgent") String urgency,
        List<String> attachmentUrls) {}
