package com.blockfoliox.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "api_keys", schema = "public")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiKey {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "exchange_id", nullable = false)
    private UUID exchangeId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "api_key_encrypted", nullable = false)
    private String apiKeyEncrypted;

    @Column(name = "api_secret_encrypted", nullable = false)
    private String apiSecretEncrypted;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
