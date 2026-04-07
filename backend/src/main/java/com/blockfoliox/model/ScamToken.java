package com.blockfoliox.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "scam_tokens", schema = "public")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ScamToken {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String symbol;
    private String name;

    @Column(name = "contract_address", unique = true)
    private String contractAddress;

    private String chain;

    @Column(name = "scam_type")
    private String scamType;

    private String source;

    @Column(name = "reported_at")
    private OffsetDateTime reportedAt;

    @Column(name = "is_verified")
    private Boolean isVerified;

    @PrePersist
    protected void onCreate() {
        reportedAt = OffsetDateTime.now();
        if (isVerified == null) isVerified = false;
        if (chain == null) chain = "ethereum";
    }
}
