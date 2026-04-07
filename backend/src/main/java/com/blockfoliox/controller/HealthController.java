package com.blockfoliox.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

@RestController
@RequestMapping("/api")
public class HealthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "BlockfolioX API",
                "version", "1.0.0"));
    }

    @GetMapping("/public/db-debug")
    public ResponseEntity<List<Map<String, Object>>> debugDb() {
        List<Map<String, Object>> data = jdbcTemplate.queryForList(
            "SELECT 'holding' as type, user_id::text, symbol, quantity::text, current_price::text FROM holdings " +
            "UNION ALL " +
            "SELECT 'trade' as type, user_id::text, symbol, quantity::text, price::text FROM trades " +
            "UNION ALL " +
            "SELECT 'risk_alert' as type, user_id::text, symbol, alert_type, risk_level FROM risk_alerts " +
            "UNION ALL " +
            "SELECT 'scam_token' as type, null, symbol, scam_type, contract_address FROM scam_tokens " +
            "ORDER BY symbol, type"
        );
        return ResponseEntity.ok(data);
    }

    @GetMapping("/public/seed-risk")
    public ResponseEntity<String> seedRisk() {
        try {
            // Get all unique user IDs from holdings and trades
            List<String> userIdsHoldings = jdbcTemplate.queryForList("SELECT DISTINCT user_id::text FROM holdings", String.class);
            List<String> userIdsTrades = jdbcTemplate.queryForList("SELECT DISTINCT user_id::text FROM trades", String.class);
            
            Set<String> allUserIds = new HashSet<>(userIdsHoldings);
            allUserIds.addAll(userIdsTrades);

            if (allUserIds.isEmpty()) return ResponseEntity.ok("No users found in holdings or trades to seed alerts for.");

            jdbcTemplate.execute("INSERT INTO scam_tokens (id, symbol, name, contract_address, scam_type, reported_at, is_verified) " +
                "VALUES (gen_random_uuid(), 'SCAM', 'Scam Token', '0xSCAM123', 'rugpull', now(), false) " +
                "ON CONFLICT (contract_address) DO NOTHING");

            jdbcTemplate.execute("INSERT INTO scam_tokens (id, symbol, name, contract_address, scam_type, reported_at, is_verified) " +
                "VALUES (gen_random_uuid(), 'RUG', 'Rugpull Token', '0xRUG456', 'rug_pull', now(), false) " +
                "ON CONFLICT (contract_address) DO NOTHING");

            int seededCount = 0;
            for (String userId : allUserIds) {
                // Ensure no duplicates by checking existence
                Integer exists = jdbcTemplate.queryForObject("SELECT count(*) FROM risk_alerts WHERE user_id = '" + userId + "' AND symbol = 'SCAM'", Integer.class);
                if (exists == null || exists == 0) {
                    jdbcTemplate.execute("INSERT INTO risk_alerts (id, user_id, symbol, token_address, risk_level, alert_type, description, is_dismissed, detected_at) " +
                        "VALUES (gen_random_uuid(), '" + userId + "', 'SCAM', '0xSCAM123', 'high', 'rug_pull', 'This is a test high-risk alert for a known rugpull token.', false, now())");
                    seededCount++;
                }
                
                Integer existsRug = jdbcTemplate.queryForObject("SELECT count(*) FROM risk_alerts WHERE user_id = '" + userId + "' AND symbol = 'RUG'", Integer.class);
                if (existsRug == null || existsRug == 0) {
                   jdbcTemplate.execute("INSERT INTO risk_alerts (id, user_id, symbol, token_address, risk_level, alert_type, description, is_dismissed, detected_at) " +
                        "VALUES (gen_random_uuid(), '" + userId + "', 'RUG', '0xRUG456', 'high', 'rug_pull', 'Token symbol matches known risk patterns: RUG', false, now())");
                   seededCount++;
                }
            }

            return ResponseEntity.ok("Risk data seeded successfully for " + allUserIds.size() + " users. Total alerts created: " + seededCount);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error seeding risk data: " + e.getMessage());
        }
    }
}
