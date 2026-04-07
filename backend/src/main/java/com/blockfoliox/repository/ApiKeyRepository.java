package com.blockfoliox.repository;

import com.blockfoliox.model.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {
    Optional<ApiKey> findByExchangeId(UUID exchangeId);

    void deleteByExchangeId(UUID exchangeId);
}
