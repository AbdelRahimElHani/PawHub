package com.pawhub.repository;

import com.pawhub.domain.Shelter;
import com.pawhub.domain.ShelterAppealState;
import com.pawhub.domain.ShelterStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShelterRepository extends JpaRepository<Shelter, Long> {

    Optional<Shelter> findByUserId(Long userId);

    List<Shelter> findByStatusOrderByCreatedAtAsc(ShelterStatus status);

    List<Shelter> findByStatusOrderByCreatedAtDesc(ShelterStatus status);

    List<Shelter> findByAppealStateOrderByAppealSubmittedAtAsc(ShelterAppealState appealState);

    /** Pending shelters that have submitted a complete dossier (ready for admin review). */
    List<Shelter> findByStatusAndProfileCompletedAtIsNotNullOrderByProfileCompletedAtAsc(ShelterStatus status);
}
