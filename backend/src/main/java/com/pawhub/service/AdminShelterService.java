package com.pawhub.service;

import com.pawhub.domain.Shelter;
import com.pawhub.domain.ShelterStatus;
import com.pawhub.repository.ShelterRepository;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.ShelterDtoMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AdminShelterService {

    private final ShelterRepository shelterRepository;

    /**
     * Admin queue: pending shelters with a submitted dossier first (oldest submission first), then any other pending
     * rows (e.g. legacy signups without dossier timestamps) for tooling and seeds.
     */
    public List<ShelterDto> pendingSubmissions() {
        List<ShelterDto> out = new ArrayList<>();
        shelterRepository
                .findByStatusAndProfileCompletedAtIsNotNullOrderByProfileCompletedAtAsc(ShelterStatus.PENDING)
                .forEach(s -> out.add(ShelterDtoMapper.fromEntity(s)));
        shelterRepository.findByStatusOrderByCreatedAtAsc(ShelterStatus.PENDING).stream()
                .filter(s -> s.getProfileCompletedAt() == null)
                .map(ShelterDtoMapper::fromEntity)
                .forEach(out::add);
        return out;
    }

    public ShelterDto getShelter(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional
    public ShelterDto approve(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        requirePending(s);
        s.setStatus(ShelterStatus.APPROVED);
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional
    public ShelterDto reject(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        requirePending(s);
        s.setStatus(ShelterStatus.REJECTED);
        return ShelterDtoMapper.fromEntity(s);
    }

    private static void requirePending(Shelter s) {
        if (s.getStatus() != ShelterStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Shelter is not pending review (current status: " + s.getStatus() + ").");
        }
    }

    private static ResponseStatusException notFound(Long shelterId) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelter not found: " + shelterId);
    }
}
