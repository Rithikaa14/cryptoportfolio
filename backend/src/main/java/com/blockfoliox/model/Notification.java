package com.blockfoliox.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications", schema = "public")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String message;

    @Column(nullable = false)
    private String type; // 'INFO', 'SUCCESS', 'WARNING', 'RISK'

    @Column(name = "is_read")
    private Boolean isRead;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        if (isRead == null) isRead = false;
    }
}
