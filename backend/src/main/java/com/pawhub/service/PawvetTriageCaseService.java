package com.pawhub.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawhub.domain.*;
import com.pawhub.repository.PawvetTriageCaseRepository;
import com.pawhub.repository.PawvetVetReportRepository;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final PawvetVetReportRepository pawvetVetReportRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final AppNotificationService appNotificationService;
    private final SimpMessagingTemplate messagingTemplate;

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
                Instant.now().toString(),
                null,
                null));
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

    /** Image or PDF for an in-progress case chat (participant only). */
    public String uploadMessageAttachment(SecurityUser principal, long caseId, MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }
        PawvetTriageCase row = triageCaseRepository.findById(caseId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (row.getStatus() != PawvetTriageCaseStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Case is not active.");
        }
        boolean owner = row.getOwner().getId().equals(principal.getId());
        boolean vet = row.getVet() != null && row.getVet().getId().equals(principal.getId());
        if (!owner && !vet) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant in this case.");
        }
        String ct = file.getContentType();
        if (ct == null || (!ct.startsWith("image/") && !"application/pdf".equalsIgnoreCase(ct))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only images and PDF files are allowed.");
        }
        return fileStorageService.store(file, "pawvet-case-msg");
    }

    /** Typing indicator for active consultation — owner or assigned vet only. */
    public void broadcastTyping(SecurityUser principal, long caseId, boolean typing) {
        PawvetTriageCase row = triageCaseRepository.findById(caseId).orElse(null);
        if (row == null || row.getStatus() != PawvetTriageCaseStatus.IN_PROGRESS) {
            return;
        }
        boolean owner = row.getOwner().getId().equals(principal.getId());
        boolean vet = row.getVet() != null && row.getVet().getId().equals(principal.getId());
        if (!owner && !vet) {
            return;
        }
        String name = principal.getUser().getDisplayName() != null && !principal.getUser().getDisplayName().isBlank()
                ? principal.getUser().getDisplayName().trim()
                : principal.getUser().getEmail();
        messagingTemplate.convertAndSend(
                "/topic/pawvet.triage." + caseId + ".typing",
                new PawvetTriageTypingEvent(principal.getId(), name, typing));
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
                newMsgId(),
                "system",
                vetName + " has claimed this case and will assist you here.",
                Instant.now().toString(),
                null,
                null));
        row.setMessagesJson(writeMessages(msgs));
        triageCaseRepository.save(row);
        PawvetTriageCaseDto dto = toDto(row);
        broadcastCaseUpdate(id, dto);
        appNotificationService.publishWithInboxNudge(
                row.getOwner().getId(),
                AppNotificationKind.PAWVET_CASE_CLAIMED,
                "A vet accepted your case",
                vetName + " is assisting you in your PawVet consultation.",
                "/pawvet/case/" + id,
                "vet",
                vet.getAvatarUrl());
        return dto;
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
        String body = req.body() == null ? "" : req.body().trim();
        String attachmentUrl = req.attachmentUrl() == null ? null : req.attachmentUrl().trim();
        if (attachmentUrl != null && attachmentUrl.isEmpty()) {
            attachmentUrl = null;
        }
        if (body.isEmpty() && attachmentUrl == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Send a message or attach a file.");
        }
        if (attachmentUrl != null) {
            if (!(attachmentUrl.startsWith("http://") || attachmentUrl.startsWith("https://"))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid attachment URL.");
            }
        }
        String attachmentKind = normalizeAttachmentKind(req.attachmentKind(), attachmentUrl);
        List<PawvetTriageChatMessageDto> msgs = readMessages(row.getMessagesJson());
        msgs.add(new PawvetTriageChatMessageDto(
                newMsgId(), sender, body, Instant.now().toString(), attachmentUrl, attachmentKind));
        row.setMessagesJson(writeMessages(msgs));
        triageCaseRepository.save(row);
        PawvetTriageCaseDto dto = toDto(row);
        broadcastCaseUpdate(id, dto);
        notifyTriageMessage(row, sender, id, body, attachmentUrl);
        return dto;
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
        String summaryText = req.summary() == null || req.summary().isBlank()
                ? "Case closed by veterinarian."
                : req.summary().trim();
        row.setStatus(PawvetTriageCaseStatus.RESOLVED);
        row.setSummary(summaryText);
        row.setResolvedAt(Instant.now());
        List<PawvetTriageChatMessageDto> msgs = readMessages(row.getMessagesJson());
        msgs.add(new PawvetTriageChatMessageDto(
                newMsgId(),
                "system",
                "Case closed. Medical summary:\n\n" + summaryText,
                Instant.now().toString(),
                null,
                null));
        row.setMessagesJson(writeMessages(msgs));
        triageCaseRepository.save(row);
        PawvetTriageCaseDto dto = toDto(row);
        broadcastCaseUpdate(id, dto);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<PawvetTriageCaseDto> listMyResolvedArchive(SecurityUser principal) {
        requireApprovedVet(principal);
        return triageCaseRepository
                .findByVet_IdAndStatusOrderByResolvedAtDesc(principal.getId(), PawvetTriageCaseStatus.RESOLVED)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PawvetVetReportAdminDto> listVetReportsForAdmin() {
        return pawvetVetReportRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toReportDto)
                .toList();
    }

    @Transactional
    public void submitVetReport(SecurityUser principal, long caseId, SubmitPawvetVetReportRequest req) {
        PawvetTriageCase row = triageCaseRepository.findById(caseId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!row.getOwner().getId().equals(principal.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the pet guardian can file this report.");
        }
        if (row.getVet() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This case has no assigned veterinarian.");
        }
        if (pawvetVetReportRepository.existsByTriageCase_IdAndReporter_Id(caseId, principal.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already submitted a report for this case.");
        }
        if (row.getStatus() != PawvetTriageCaseStatus.IN_PROGRESS && row.getStatus() != PawvetTriageCaseStatus.RESOLVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This case cannot be reported.");
        }
        User reporter = userRepository.getReferenceById(principal.getId());
        PawvetVetReport built = PawvetVetReport.builder()
                .triageCase(row)
                .vet(row.getVet())
                .reporter(reporter)
                .reason(req.reason().trim())
                .build();
        pawvetVetReportRepository.save(built);
        appNotificationService.publishToAdmins(
                AppNotificationKind.ADMIN_PAWVET_VET_REPORT,
                "PawVet veterinarian report",
                String.format(
                        "%s reported veterinarian %s (case #%d, %s).",
                        principal.getUser().getDisplayName(),
                        row.getVet().getDisplayName(),
                        row.getId(),
                        row.getCatName()),
                "/adopt/admin/pawvet-reports");
    }

    private void notifyTriageMessage(PawvetTriageCase row, String sender, long caseId, String body, String attachmentUrl) {
        String preview;
        if (body != null && !body.isEmpty()) {
            preview = body;
            if (preview.length() > 160) {
                preview = preview.substring(0, 157) + "…";
            }
        } else if (attachmentUrl != null) {
            preview = "Sent an attachment";
        } else {
            preview = "New activity";
        }
        if ("vet".equals(sender)) {
            appNotificationService.publishWithInboxNudge(
                    row.getOwner().getId(),
                    AppNotificationKind.PAWVET_TRIAGE_MESSAGE,
                    "New message in your PawVet case",
                    preview,
                    "/pawvet/case/" + caseId,
                    "message",
                    row.getVet() != null ? row.getVet().getAvatarUrl() : null);
            return;
        }
        if ("user".equals(sender) && row.getVet() != null) {
            appNotificationService.publishWithInboxNudge(
                    row.getVet().getId(),
                    AppNotificationKind.PAWVET_TRIAGE_MESSAGE,
                    "New message from pet guardian",
                    preview,
                    "/pawvet/case/" + caseId,
                    "message",
                    row.getOwner().getAvatarUrl());
        }
    }

    private PawvetVetReportAdminDto toReportDto(PawvetVetReport r) {
        PawvetTriageCase c = r.getTriageCase();
        User v = r.getVet();
        User rep = r.getReporter();
        return new PawvetVetReportAdminDto(
                r.getId(),
                c.getId(),
                c.getCatName(),
                v.getId(),
                v.getDisplayName(),
                v.getEmail(),
                rep.getId(),
                rep.getDisplayName(),
                rep.getEmail(),
                r.getReason(),
                r.getCreatedAt());
    }

    private void broadcastCaseUpdate(long caseId, PawvetTriageCaseDto dto) {
        messagingTemplate.convertAndSend("/topic/pawvet.triage." + caseId, dto);
    }

    private static String normalizeAttachmentKind(String kind, String url) {
        if (kind != null && !kind.isBlank()) {
            String k = kind.trim().toLowerCase();
            if ("image".equals(k) || "pdf".equals(k)) {
                return k;
            }
        }
        if (url == null) {
            return null;
        }
        String u = url.toLowerCase();
        if (u.endsWith(".pdf") || u.contains(".pdf?")) {
            return "pdf";
        }
        return "image";
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
                Object au = m.get("attachmentUrl");
                String attUrl = null;
                if (au != null) {
                    String s = String.valueOf(au).trim();
                    if (!s.isEmpty() && !"null".equalsIgnoreCase(s)) {
                        attUrl = s;
                    }
                }
                Object ak = m.get("attachmentKind");
                String attKind = null;
                if (ak != null) {
                    String s = String.valueOf(ak).trim().toLowerCase();
                    if ("image".equals(s) || "pdf".equals(s)) {
                        attKind = s;
                    }
                }
                if (attUrl != null && attKind == null) {
                    attKind = normalizeAttachmentKind(null, attUrl);
                }
                out.add(new PawvetTriageChatMessageDto(id, sender, body, at, attUrl, attKind));
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
