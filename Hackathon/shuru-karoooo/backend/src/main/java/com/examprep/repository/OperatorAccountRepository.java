package com.examprep.repository;

import com.examprep.entity.OperatorAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OperatorAccountRepository extends JpaRepository<OperatorAccount, Long> {
    Optional<OperatorAccount> findByEmail(String email);

    boolean existsByEmail(String email);
}
