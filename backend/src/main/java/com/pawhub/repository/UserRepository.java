package com.pawhub.repository;

import com.pawhub.domain.User;
import com.pawhub.domain.UserAccountType;
import com.pawhub.domain.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByEmailVerificationToken(String token);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByAccountTypeOrderByIdAsc(UserAccountType accountType);

    List<User> findByRole(UserRole role);

    @Query(
            "SELECT u FROM User u WHERE u.pawMarketBanned = true OR u.pawAdoptBanned = true ORDER BY"
                    + " u.displayName ASC, u.id ASC")
    List<User> findWithPawMarketOrAdoptBan();
}
