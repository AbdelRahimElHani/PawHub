package com.pawhub.repository;

import com.pawhub.domain.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByEmailVerificationToken(String token);

    boolean existsByEmailIgnoreCase(String email);
}
