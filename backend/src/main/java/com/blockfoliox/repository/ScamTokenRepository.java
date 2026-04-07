package com.blockfoliox.repository;

import com.blockfoliox.model.ScamToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScamTokenRepository extends JpaRepository<ScamToken, UUID> {
    Optional<ScamToken> findByContractAddress(String contractAddress);

    java.util.List<ScamToken> findBySymbol(String symbol);
}
