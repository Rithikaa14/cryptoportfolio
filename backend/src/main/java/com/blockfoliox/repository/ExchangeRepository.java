package com.blockfoliox.repository;

import com.blockfoliox.model.Exchange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExchangeRepository extends JpaRepository<Exchange, UUID> {
    List<Exchange> findByUserId(UUID userId);
    java.util.Optional<Exchange> findByUserIdAndName(UUID userId, String name);
}
