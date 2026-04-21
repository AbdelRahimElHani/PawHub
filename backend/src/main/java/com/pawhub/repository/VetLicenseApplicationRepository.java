package com.pawhub.repository;

import com.pawhub.domain.VetLicenseApplication;
import com.pawhub.domain.VetVerificationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VetLicenseApplicationRepository extends JpaRepository<VetLicenseApplication, Long> {

    Optional<VetLicenseApplication> findByUser_Id(Long userId);

    List<VetLicenseApplication> findByStatusOrderByCreatedAtAsc(VetVerificationStatus status);

    long countByStatus(VetVerificationStatus status);

    List<VetLicenseApplication> findTop8ByStatusOrderByCreatedAtDesc(VetVerificationStatus status);
}
