package com.blockfoliox.repository;

import com.blockfoliox.model.Holding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface HoldingRepository extends JpaRepository<Holding, UUID> {
    List<Holding> findByUserId(UUID userId);

    List<Holding> findByUserIdAndSymbol(UUID userId, String symbol);

    void deleteByIdAndUserId(UUID id, UUID userId);
}
