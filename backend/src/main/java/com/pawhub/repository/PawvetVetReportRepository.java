package com.pawhub.repository;

import com.pawhub.domain.PawvetVetReport;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PawvetVetReportRepository extends JpaRepository<PawvetVetReport, Long> {

    boolean existsByTriageCase_IdAndReporter_Id(long caseId, long reporterId);

    List<PawvetVetReport> findAllByOrderByCreatedAtDesc();
}
