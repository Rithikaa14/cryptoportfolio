package com.blockfoliox.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "risk_alerts", schema = "public")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RiskAlert {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String symbol;

    @Column(name = "token_address")
    private String tokenAddress;

    @Column(name = "risk_level", nullable = false)
    private String riskLevel; // 'low', 'medium', 'high'

    @Column(name = "alert_type", nullable = false)
    private String alertType; // 'scam', 'rug_pull', 'honeypot', 'suspicious'

    @Column
    private String description;

    @Column(name = "is_dismissed")
    private Boolean isDismissed;

    @Column(name = "detected_at")
    private OffsetDateTime detectedAt;

    @PrePersist
    protected void onCreate() {
        detectedAt = OffsetDateTime.now();
        if (isDismissed == null) isDismissed = false;
    }
}
