package com.pawhub.service;

import com.pawhub.domain.Shelter;
import com.pawhub.domain.ShelterStatus;
import com.pawhub.repository.ShelterRepository;
import com.pawhub.web.dto.ShelterDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminShelterService {

    private final ShelterRepository shelterRepository;

    public List<ShelterDto> pending() {
        return shelterRepository.findByStatusOrderByCreatedAtAsc(ShelterStatus.PENDING).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ShelterDto approve(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow();
        s.setStatus(ShelterStatus.APPROVED);
        return toDto(s);
    }

    @Transactional
    public ShelterDto reject(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow();
        s.setStatus(ShelterStatus.REJECTED);
        return toDto(s);
    }

    private ShelterDto toDto(Shelter s) {
        return new ShelterDto(
                s.getId(),
                s.getUser().getId(),
                s.getName(),
                s.getCity(),
                s.getRegion(),
                s.getPhone(),
                s.getEmailContact(),
                s.getBio(),
                s.getStatus().name());
    }
}
