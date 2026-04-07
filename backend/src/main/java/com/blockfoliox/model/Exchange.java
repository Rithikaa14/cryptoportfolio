package com.blockfoliox.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "exchanges", schema = "public")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Exchange {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "last_synced_at")
    private OffsetDateTime lastSyncedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
        if (isActive == null) isActive = true;
    }
}
