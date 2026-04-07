package com.blockfoliox.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "price_snapshots", schema = "public")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PriceSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal price;

    @Column(name = "market_cap", precision = 20, scale = 2)
    private BigDecimal marketCap;

    @Column(name = "volume_24h", precision = 20, scale = 2)
    private BigDecimal volume24h;

    @Column(name = "price_change_24h", precision = 10, scale = 4)
    private BigDecimal priceChange24h;

    @Column(name = "recorded_at")
    private OffsetDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) recordedAt = OffsetDateTime.now();
    }
}
