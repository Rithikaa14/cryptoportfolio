package com.blockfoliox.repository;

import com.blockfoliox.model.PriceSnapshot;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PriceSnapshotRepository extends JpaRepository<PriceSnapshot, UUID> {

    Optional<PriceSnapshot> findTopBySymbolOrderByRecordedAtDesc(String symbol);

    List<PriceSnapshot> findBySymbolOrderByRecordedAtDesc(String symbol, Pageable pageable);

    /** All snapshots for a symbol after a given date, ascending (oldest first) */
    List<PriceSnapshot> findBySymbolAndRecordedAtAfterOrderByRecordedAtAsc(
            String symbol, OffsetDateTime after);

    /** Latest snapshot for a symbol before or at a given point in time */
    Optional<PriceSnapshot> findTopBySymbolAndRecordedAtBeforeOrderByRecordedAtDesc(
            String symbol, OffsetDateTime before);
}
