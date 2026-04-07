package com.blockfoliox.service;

import com.blockfoliox.model.*;
import com.blockfoliox.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeService {

    private final ExchangeRepository exchangeRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final HoldingRepository holdingRepository;

    @Value("${app.binance.base-url}")
    private String binanceBaseUrl;

    @Value("${app.encryption.key}")
    private String encryptionKey;

    public List<Exchange> getUserExchanges(UUID userId) {
        return exchangeRepository.findByUserId(userId);
    }

    @Transactional
    public Exchange connectExchange(UUID userId, String exchangeName, String apiKey, String apiSecret) {
        log.info("Connecting exchange {} for user {}", exchangeName, userId);

        Exchange exchange = exchangeRepository.findByUserIdAndName(userId, exchangeName)
                .orElseGet(() -> Exchange.builder()
                        .userId(userId)
                        .name(exchangeName)
                        .build());

        exchange.setIsActive(true); // Always set to active on re-connect
        exchange = exchangeRepository.save(exchange);

        // Update or Create ApiKey
        final UUID exchangeId = exchange.getId();
        ApiKey key = apiKeyRepository.findByExchangeId(exchangeId)
                .orElseGet(() -> ApiKey.builder()
                        .exchangeId(exchangeId)
                        .userId(userId)
                        .build());

        try {
            key.setApiKeyEncrypted(encrypt(apiKey));
            key.setApiSecretEncrypted(encrypt(apiSecret));
            apiKeyRepository.save(key);
        } catch (Exception e) {
            log.error("Failed to encrypt API keys for exchange {}: {}", exchangeName, e.getMessage());
            throw new RuntimeException("Encryption failed. Please verify your system encryption settings.");
        }

        return exchange;
    }

    @Transactional
    public void syncExchange(UUID userId, UUID exchangeId) {
        Exchange exchange = exchangeRepository.findById(exchangeId)
                .orElseThrow(() -> new RuntimeException("Exchange not found"));
        if (!exchange.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        log.info("Syncing exchange {} for user {}", exchange.getName(), userId);

        // DEMO MODE: Generate mock balances
        if ("Binance".equalsIgnoreCase(exchange.getName())) {
            generateMockHolding(userId, "BTC", new java.math.BigDecimal("0.45"), "Binance-Sync");
            generateMockHolding(userId, "ETH", new java.math.BigDecimal("5.20"), "Binance-Sync");
            generateMockHolding(userId, "BNB", new java.math.BigDecimal("12.00"), "Binance-Sync");
        } else if ("Coinbase".equalsIgnoreCase(exchange.getName())) {
            generateMockHolding(userId, "USDC", new java.math.BigDecimal("1250.00"), "Coinbase-Sync");
            generateMockHolding(userId, "SOL", new java.math.BigDecimal("15.5"), "Coinbase-Sync");
            generateMockHolding(userId, "ADA", new java.math.BigDecimal("450.00"), "Coinbase-Sync");
        } else if ("Kraken".equalsIgnoreCase(exchange.getName())) {
            generateMockHolding(userId, "DOT", new java.math.BigDecimal("75.00"), "Kraken-Sync");
            generateMockHolding(userId, "LINK", new java.math.BigDecimal("10.00"), "Kraken-Sync");
        } else {
            // In production, fetch real balances via respective APIs
            log.info("Real sync logic for {} would execute here.", exchange.getName());
        }

        exchange.setLastSyncedAt(OffsetDateTime.now());
        exchangeRepository.save(exchange);
    }

    private void generateMockHolding(UUID userId, String symbol, java.math.BigDecimal qty, String source) {
        List<Holding> existing = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        Holding h;
        if (existing.isEmpty()) {
            h = Holding.builder()
                    .userId(userId)
                    .symbol(symbol)
                    .name(symbol)
                    .quantity(qty)
                    .avgBuyPrice(java.math.BigDecimal.ZERO)
                    .source(source)
                    .build();
        } else {
            h = existing.get(0);
            h.setQuantity(h.getQuantity().add(qty));
            h.setSource(source);
        }
        holdingRepository.save(h);
    }

    @Transactional
    public void toggleExchangeStatus(UUID userId, UUID exchangeId) {
        Exchange exchange = exchangeRepository.findById(exchangeId)
                .orElseThrow(() -> new RuntimeException("Exchange not found"));
        if (!exchange.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        exchange.setIsActive(!exchange.getIsActive());
        exchangeRepository.save(exchange);
        log.info("Exchange {} {} for user {}", exchange.getName(), exchange.getIsActive() ? "activated" : "paused", userId);
    }

    @Transactional
    public void disconnectExchange(UUID userId, UUID exchangeId) {
        Exchange exchange = exchangeRepository.findById(exchangeId)
                .orElseThrow(() -> new RuntimeException("Exchange not found"));
        if (!exchange.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        apiKeyRepository.deleteByExchangeId(exchangeId);
        exchangeRepository.delete(exchange);
        log.info("Disconnected exchange {} for user {}", exchange.getName(), userId);
    }

    // ── Encryption helpers ──
    private String encrypt(String plaintext) {
        try {
            byte[] keyBytes = Arrays.copyOf(encryptionKey.getBytes(StandardCharsets.UTF_8), 32);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    @SuppressWarnings("unused")
    private String decrypt(String ciphertext) {
        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);
            byte[] keyBytes = Arrays.copyOf(encryptionKey.getBytes(StandardCharsets.UTF_8), 32);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
            byte[] iv = Arrays.copyOfRange(combined, 0, 12);
            byte[] encrypted = Arrays.copyOfRange(combined, 12, combined.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
