package com.blockfoliox.controller;

import com.blockfoliox.model.Holding;
import com.blockfoliox.service.HoldingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/holdings")
@RequiredArgsConstructor
public class HoldingController {

    private final HoldingService holdingService;

    @GetMapping
    public ResponseEntity<List<Holding>> getHoldings(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(holdingService.getUserHoldings(userId));
    }

    @PostMapping
    public ResponseEntity<Holding> createHolding(Authentication auth, @RequestBody Holding holding) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(holdingService.createHolding(userId, holding));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Holding> updateHolding(Authentication auth, @PathVariable("id") UUID id,
            @RequestBody Holding holding) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(holdingService.updateHolding(userId, id, holding));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHolding(Authentication auth, @PathVariable("id") UUID id) {
        UUID userId = (UUID) auth.getPrincipal();
        holdingService.deleteHolding(userId, id);
        return ResponseEntity.ok().build();
    }
}
