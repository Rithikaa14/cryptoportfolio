package com.blockfoliox.controller;

import com.blockfoliox.model.Exchange;
import com.blockfoliox.service.ExchangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/exchanges")
@RequiredArgsConstructor
public class ExchangeController {

    private final ExchangeService exchangeService;

    @GetMapping
    public ResponseEntity<List<Exchange>> getExchanges(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(exchangeService.getUserExchanges(userId));
    }

    @PostMapping("/connect")
    public ResponseEntity<Exchange> connectExchange(Authentication auth, @RequestBody Map<String, String> body) {
        UUID userId = (UUID) auth.getPrincipal();
        Exchange exchange = exchangeService.connectExchange(
                userId, body.get("exchangeName"), body.get("apiKey"), body.get("apiSecret"));
        return ResponseEntity.ok(exchange);
    }

    @PostMapping("/{id}/sync")
    public ResponseEntity<Void> syncExchange(Authentication auth, @PathVariable("id") UUID id) {
        UUID userId = (UUID) auth.getPrincipal();
        exchangeService.syncExchange(userId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<?> toggleExchange(Authentication auth, @PathVariable("id") UUID id) {
        try {
            UUID userId = (UUID) auth.getPrincipal();
            exchangeService.toggleExchangeStatus(userId, id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> disconnectExchange(Authentication auth, @PathVariable("id") UUID id) {
        UUID userId = (UUID) auth.getPrincipal();
        exchangeService.disconnectExchange(userId, id);
        return ResponseEntity.ok().build();
    }
}
