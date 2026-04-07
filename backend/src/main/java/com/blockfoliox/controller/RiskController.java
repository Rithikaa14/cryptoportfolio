package com.blockfoliox.controller;

import com.blockfoliox.model.RiskAlert;
import com.blockfoliox.service.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
public class RiskController {

    private final RiskService riskService;

    @GetMapping("/alerts")
    public ResponseEntity<List<RiskAlert>> getAlerts(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(riskService.getUserAlerts(userId));
    }

    @PostMapping("/check")
    public ResponseEntity<Map<String, Object>> checkToken(Authentication auth, @RequestBody Map<String, String> body) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(riskService.checkToken(userId, body.get("tokenAddress")));
    }

    @PostMapping("/{id}/dismiss")
    public ResponseEntity<Void> dismissAlert(Authentication auth, @PathVariable("id") UUID id) {
        UUID userId = (UUID) auth.getPrincipal();
        riskService.dismissAlert(userId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/seed-me")
    public ResponseEntity<String> seedMe(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        riskService.triggerRiskAssessment(userId, "SCAM");
        riskService.triggerRiskAssessment(userId, "RUG");
        return ResponseEntity.ok("Risk data seeded for user: " + userId);
    }
}
