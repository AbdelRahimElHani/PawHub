package com.pawhub.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawhub.domain.*;
import com.pawhub.repository.PawvetTriageCaseRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.repository.VetLicenseApplicationRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PawvetTriageCaseService {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, Object>>> MSG_MAP_LIST = new TypeReference<>() {};

    private final PawvetTriageCaseRepository triageCaseRepository;
    private final UserRepository userRepository;
    private final VetLicenseApplicationRepository vetLicenseApplicationRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final AppNotificationService appNotificationService;

    @Transactional
    public PawvetTriageCaseDto create(SecurityUser principal, CreatePawvetTriageCaseRequest req) {
        requireCanFileCase(principal);
        User owner = userRepository.getReferenceById(principal.getId());
        List<String> urls = sanitizeUrls(req.attachmentUrls());
        String catSnapJson = null;
        try {
            if (req.catSnapshot() != null && !req.catSnapshot().isEmpty()) {
                catSnapJson = objectMapper.writeValueAsString(req.catSnapshot());
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid cat snapshot payload.");
        }
        String urlsJson = writeUrls(urls);
        List<PawvetTriageChatMessageDto> initial = List.of(new PawvetTriageChatMessageDto(
                newMsgId(),
                "system",
                "Case filed. A verified vet will review and may claim this case shortly.",
                Instant.now().toString()));
        String messagesJson = writeMessages(initial);
        PawvetTriageCase row = PawvetTriageCase.builder()
                .owner(owner)
                .catId(req.catId())
                .catName(req.catName().trim())
                .catSnapshotJson(catSnapJson)
                .symptoms(req.symptoms().trim())
                .mediaDescription(req.mediaDescription() == null ? "" : req.mediaDescription().trim())
                .attachmentUrlsJson(urlsJson)
                .urgency(req.urgency())
                .status(PawvetTriageCaseStatus.OPEN)
                .messagesJson(messagesJson)
                .build();
        triageCaseRepository.save(row);
        String catLabel = row.getCatName().replace("\"", "'");
        appNotificationService.publishToApprovedVeterinarians(
                AppNotificationKind.PAWVET_NEW_TRIAGE_CASE,
                "New triage case",
                String.format("A guardian filed an open PawVet case for \"%s\" (urgency: %s).", catLabel, row.getUrgency()),
                "/vet");
        return toDto(row);
    }

    public String uploadMedia(SecurityUser principal, MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }
        requireCanFileCase(principal);
        return fileStorageService.store(file, "pawvet-case");
    }

    @Transactional(readOnly = true)
    public List<PawvetTriageCaseDto> listOpenBoard(SecurityUser principal) {
        requireApprovedVet(principal);
        return triageCaseRepository.findByStatusOrderByCreatedAtDesc(PawvetTriageCaseStatus.OPEN).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PawvetTriageCaseDto> listMineAsOwner(SecurityUser principal) {
        return triageCaseRepository.findByOwner_IdOrderByCreatedAtDesc(principal.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PawvetTriageCaseDto> listMyClaims(SecurityUser principal) {
        requireApprovedVet(principal);
        return triageCaseRepository
                .findByVet_IdAndStatusOrderByCreatedAtDesc(principal.getId(), PawvetTriageCaseStatus.IN_PROGRESS)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public PawvetTriageCaseDto get(SecurityUser principal, long id) {
        PawvetTriageCase row = triageCaseRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        assertCanView(principal, row);
        return toDto(row);
    }

    @Transactional
    public PawvetTriageCaseDto claim(SecurityUser principal, long id) {
        requireApprovedVet(principal);
        PawvetTriageCase row = triageCaseRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (row.getStatus() != PawvetTriageCaseStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Case is not open.");
        }
        User vet = userRepository.getReferenceById(principal.getId());
        String vetName = formatVetName(vet.getDisplayName());
        row.setStatus(PawvetTriageCaseStatus.IN_PROGRESS);
        row.setVet(vet);
        row.setVetDisplayName(vetName);
        row.setVetAvatarUrl(vet.getAvatarUrl());
        List<PawvetTriageChatMessageDto> msgs = readMessages(row.getMessagesJson());
        msgs.add(new PawvetTriageChatMessageDto(
                newMsgId(), "system", vetName + " has claimed this case and will assist you here.", Instant.now().toString()));
        row.setMessagesJson(writeMessages(msgs));
        triageCaseRepository.save(row);
        return toDto(row);
    }

    @Transactional
    public PawvetTriageCaseDto appendMessage(SecurityUser principal, long id, AppendPawvetTriageMessageRequest req) {
        PawvetTriageCase row = triageCaseRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (row.getStatus() != PawvetTriageCaseStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Case is not active.");
        }
        boolean owner = row.getOwner().getId().equals(principal.getId());
        boolean vet = row.getVet() != null && row.getVet().getId().equals(principal.getId());
        if (!owner && !vet) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant in this case.");
        }
        String sender = vet ? "vet" : "user";
        List<PawvetTriageChatMessageDto> msgs = readMessages(row.getMessagesJson());
        msgs.add(new PawvetTriageChatMessageDto(newMsgId(), sender, req.body().trim(), Instant.now().toString()));
        row.setMessagesJson(writeMessages(msgs));
        triageCaseRepository.save(row);
        return toDto(row);
    }

    @Transactional
    public PawvetTriageCaseDto resolve(SecurityUser principal, long id, ResolvePawvetTriageCaseRequest req) {
        requireApprovedVet(principal);
        PawvetTriageCase row = triageCaseRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (row.getStatus() != PawvetTriageCaseStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Case is not in progress.");
        }
        if (row.getVet() == null || !row.getVet().getId().equals(principal.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the assigned veterinarian can close this case.");
        }
        row.setStatus(PawvetTriageCaseStatus.RESOLVED);
        row.setSummary(req.summary().trim());
        row.setResolvedAt(Instant.now());
        List<PawvetTriageChatMessageDto> msgs = readMessages(row.getMessagesJson());
        msgs.add(new PawvetTriageChatMessageDto(
                newMsgId(),
                "system",
                "Case closed. Medical summary:\n\n" + req.summary().trim(),
                Instant.now().toString()));
        row.setMessagesJson(writeMessages(msgs));
        triageCaseRepository.save(row);
        return toDto(row);
    }

    private void requireCanFileCase(SecurityUser principal) {
        if (principal.getUser().getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrators do not file guardian triage cases.");
        }
        if (principal.getUser().getAccountType() == UserAccountType.VET) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Veterinarian accounts cannot file guardian triage cases.");
        }
    }

    private void requireApprovedVet(SecurityUser principal) {
        if (principal.getUser().getAccountType() != UserAccountType.VET) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only veterinarian accounts can perform this action.");
        }
        VetLicenseApplication app = vetLicenseApplicationRepository
                .findByUser_Id(principal.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No veterinarian application on file."));
        if (app.getStatus() != VetVerificationStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your veterinarian credentials are not approved yet.");
        }
    }

    private void assertCanView(SecurityUser principal, PawvetTriageCase row) {
        if (row.getOwner().getId().equals(principal.getId())) {
            return;
        }
        if (row.getVet() != null && row.getVet().getId().equals(principal.getId())) {
            return;
        }
        if (row.getStatus() == PawvetTriageCaseStatus.OPEN && principal.getUser().getAccountType() == UserAccountType.VET) {
            VetLicenseApplication app = vetLicenseApplicationRepository.findByUser_Id(principal.getId()).orElse(null);
            if (app != null && app.getStatus() == VetVerificationStatus.APPROVED) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot view this case.");
    }

    private static String formatVetName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return "Dr. Veterinarian";
        }
        String t = displayName.trim();
        if (t.regionMatches(true, 0, "dr.", 0, 3) || t.regionMatches(true, 0, "dr ", 0, 3)) {
            return t;
        }
        return "Dr. " + t;
    }

    private PawvetTriageCaseDto toDto(PawvetTriageCase row) {
        Map<String, Object> snap = null;
        if (row.getCatSnapshotJson() != null && !row.getCatSnapshotJson().isBlank()) {
            try {
                snap = objectMapper.readValue(row.getCatSnapshotJson(), new TypeReference<>() {});
            } catch (Exception ignored) {
            }
        }
        List<String> urls = readUrls(row.getAttachmentUrlsJson());
        return new PawvetTriageCaseDto(
                row.getId(),
                row.getOwner().getId(),
                row.getOwner().getDisplayName(),
                row.getOwner().getAvatarUrl(),
                row.getCatId(),
                row.getCatName(),
                snap,
                row.getSymptoms(),
                row.getMediaDescription(),
                urls,
                row.getUrgency(),
                row.getStatus().name(),
                row.getVet() != null ? row.getVet().getId() : null,
                row.getVetDisplayName(),
                row.getVetAvatarUrl(),
                row.getCreatedAt(),
                row.getResolvedAt(),
                readMessages(row.getMessagesJson()),
                row.getSummary());
    }

    private List<PawvetTriageChatMessageDto> readMessages(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<Map<String, Object>> raw = objectMapper.readValue(json, MSG_MAP_LIST);
            List<PawvetTriageChatMessageDto> out = new ArrayList<>();
            for (Map<String, Object> m : raw) {
                String id = String.valueOf(m.getOrDefault("id", ""));
                String sender = String.valueOf(m.getOrDefault("sender", "system"));
                String body = String.valueOf(m.getOrDefault("body", ""));
                String at = String.valueOf(m.getOrDefault("at", Instant.now().toString()));
                out.add(new PawvetTriageChatMessageDto(id, sender, body, at));
            }
            return out;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String writeMessages(List<PawvetTriageChatMessageDto> msgs) {
        try {
            return objectMapper.writeValueAsString(msgs);
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialize messages", e);
        }
    }

    private List<String> readUrls(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> list = objectMapper.readValue(json, STRING_LIST);
            return list == null ? List.of() : list.stream().filter(s -> s != null && !s.isBlank()).toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private String writeUrls(List<String> urls) {
        try {
            return objectMapper.writeValueAsString(urls);
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialize attachment URLs", e);
        }
    }

    private static List<String> sanitizeUrls(List<String> in) {
        if (in == null || in.isEmpty()) {
            return List.of();
        }
        return in.stream()
                .filter(s -> s != null && !s.isBlank() && (s.startsWith("http://") || s.startsWith("https://")))
                .limit(12)
                .toList();
    }

    private static String newMsgId() {
        return "m_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
    }
}
