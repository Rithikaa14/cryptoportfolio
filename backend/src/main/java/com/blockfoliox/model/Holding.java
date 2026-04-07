package com.blockfoliox.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "holdings", schema = "public")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Holding {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal quantity;

    @Column(name = "avg_buy_price", precision = 20, scale = 8)
    private BigDecimal avgBuyPrice;

    @Column(name = "current_price", precision = 20, scale = 8)
    private BigDecimal currentPrice;

    @Column
    private String source;

    @Column(name = "exchange_id")
    private UUID exchangeId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
