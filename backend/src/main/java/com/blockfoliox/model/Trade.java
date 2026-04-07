package com.blockfoliox.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "trades", schema = "public")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Trade {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false)
    private String side; // 'buy' or 'sell'

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal price;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal total;

    @Column(precision = 20, scale = 8)
    private BigDecimal fee;

    @Column(name = "exchange_name")
    private String exchangeName;

    @Column
    private String source;

    @Column(name = "traded_at")
    private OffsetDateTime tradedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        if (tradedAt == null) tradedAt = OffsetDateTime.now();
    }
}
