package com.pawhub.repository;

import com.pawhub.domain.PawvetConsultationReview;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PawvetConsultationReviewRepository extends JpaRepository<PawvetConsultationReview, Long> {

    boolean existsByExternalCaseId(String externalCaseId);

    @EntityGraph(attributePaths = {"owner"})
    List<PawvetConsultationReview> findByVet_IdOrderByCreatedAtDesc(Long vetUserId);

    @EntityGraph(attributePaths = {"owner", "vet"})
    List<PawvetConsultationReview> findByVet_IdIn(Collection<Long> vetUserIds);
}
