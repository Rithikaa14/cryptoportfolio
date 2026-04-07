package com.blockfoliox.service;

import com.blockfoliox.model.Notification;
import com.blockfoliox.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public List<Notification> getUserNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(UUID userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public void createNotification(UUID userId, String title, String message, String type) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .createdAt(OffsetDateTime.now())
                .build();
        notificationRepository.save(notification);
        log.info("Created {} notification for user {}: {}", type, userId, title);
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void markAsRead(UUID userId, UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(userId)) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }
}
