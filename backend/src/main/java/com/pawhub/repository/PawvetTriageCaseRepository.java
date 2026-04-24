package com.pawhub.repository;

import com.pawhub.domain.PawvetTriageCase;
import com.pawhub.domain.PawvetTriageCaseStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PawvetTriageCaseRepository extends JpaRepository<PawvetTriageCase, Long> {

    List<PawvetTriageCase> findByStatusOrderByCreatedAtDesc(PawvetTriageCaseStatus status);

    List<PawvetTriageCase> findByOwner_IdOrderByCreatedAtDesc(Long ownerId);

    List<PawvetTriageCase> findByVet_IdAndStatusOrderByCreatedAtDesc(Long vetId, PawvetTriageCaseStatus status);
}
