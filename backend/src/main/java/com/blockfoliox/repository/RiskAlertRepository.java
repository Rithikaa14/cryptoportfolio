package com.blockfoliox.repository;

import com.blockfoliox.model.RiskAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RiskAlertRepository extends JpaRepository<RiskAlert, UUID> {
    List<RiskAlert> findByUserId(UUID userId);

    List<RiskAlert> findByUserIdAndIsDismissedFalse(UUID userId);

    Optional<RiskAlert> findFirstByUserIdAndTokenAddressAndIsDismissedFalse(UUID userId, String tokenAddress);
}
