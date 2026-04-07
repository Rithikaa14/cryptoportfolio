package com.blockfoliox.controller;

import com.blockfoliox.model.Notification;
import com.blockfoliox.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(notificationService.getUnreadNotifications(userId));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(Authentication auth, @PathVariable("id") UUID id) {
        UUID userId = (UUID) auth.getPrincipal();
        notificationService.markAsRead(userId, id);
        return ResponseEntity.ok().build();
    }
}
