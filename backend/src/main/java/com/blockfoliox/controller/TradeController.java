package com.blockfoliox.controller;

import com.blockfoliox.model.Trade;
import com.blockfoliox.service.TradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @GetMapping
    public ResponseEntity<List<Trade>> getTrades(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(tradeService.getUserTrades(userId));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<Trade>> getRecentTrades(Authentication auth,
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            @RequestParam(name = "todayOnly", defaultValue = "false") boolean todayOnly) {
        try {
            UUID userId = (UUID) auth.getPrincipal();
            return ResponseEntity.ok(tradeService.getRecentTrades(userId, limit, todayOnly));
        } catch (Exception e) {
            log.error("CRITICAL ERROR in getRecentTrades: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping
    public ResponseEntity<Trade> createTrade(Authentication auth, @RequestBody Trade trade) {
        try {
            UUID userId = (UUID) auth.getPrincipal();
            return ResponseEntity.ok(tradeService.createTrade(userId, trade));
        } catch (Exception e) {
            log.error("CRITICAL ERROR in createTrade: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/recalculate")
    public ResponseEntity<Void> recalculateHoldings(Authentication auth) {
        try {
            UUID userId = (UUID) auth.getPrincipal();
            tradeService.recalculateHoldings(userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("CRITICAL ERROR in recalculateHoldings: {}", e.getMessage(), e);
            throw e;
        }
    }
}
