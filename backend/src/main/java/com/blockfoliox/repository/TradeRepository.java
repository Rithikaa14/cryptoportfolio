package com.blockfoliox.repository;

import com.blockfoliox.model.Trade;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TradeRepository extends JpaRepository<Trade, UUID> {
    List<Trade> findByUserIdOrderByTradedAtDesc(UUID userId);
    
    List<Trade> findByUserIdOrderByTradedAtAsc(UUID userId);

    org.springframework.data.domain.Page<Trade> findAllByUserIdOrderByTradedAtDesc(UUID userId, Pageable pageable);

    List<Trade> findByUserIdAndSymbol(UUID userId, String symbol);
    
    List<Trade> findByUserIdAndTradedAtAfterOrderByTradedAtDesc(UUID userId, java.time.OffsetDateTime after);
}
