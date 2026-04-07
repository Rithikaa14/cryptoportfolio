package com.blockfoliox.service;

import com.blockfoliox.model.RiskAlert;
import com.blockfoliox.model.ScamToken;
import com.blockfoliox.repository.RiskAlertRepository;
import com.blockfoliox.repository.ScamTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RiskService {

    private final RiskAlertRepository alertRepository;
    private final ScamTokenRepository scamTokenRepository;
    private final WebClient.Builder webClientBuilder;
    private final NotificationService notificationService;

    @Value("${app.etherscan.base-url}")
    private String etherscanBaseUrl;

    @Value("${app.etherscan.api-key:}")
    private String etherscanApiKey;

    @Value("${app.cryptoscamdb.base-url}")
    private String cryptoScamDbBaseUrl;

    public List<RiskAlert> getUserAlerts(UUID userId) {
        return alertRepository.findByUserId(userId);
    }

    public List<RiskAlert> getActiveAlerts(UUID userId) {
        return alertRepository.findByUserIdAndIsDismissedFalse(userId);
    }

    public Map<String, Object> checkToken(UUID userId, String contractAddress) {
        Map<String, Object> result = new HashMap<>();
        result.put("address", contractAddress);

        // Check local scam DB first
        Optional<ScamToken> knownScam = scamTokenRepository.findByContractAddress(contractAddress);
        if (knownScam.isPresent()) {
            result.put("isScam", true);
            result.put("riskLevel", "high");
            result.put("details", knownScam.get());

            // Create alert
            createAlert(userId, knownScam.get().getSymbol(), contractAddress,
                    "high", "scam", "Known scam token: " + knownScam.get().getScamType());
            return result;
        }

        // Check Etherscan for contract verification
        try {
            String url = etherscanBaseUrl + "?module=contract&action=getsourcecode&address=" +
                    contractAddress + "&apikey=" + etherscanApiKey;

            Map<String, Object> response = webClientBuilder.build()
                    .get().uri(url)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block();

            if (response != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("result");
                if (results != null && !results.isEmpty()) {
                    String sourceCode = (String) results.get(0).get("SourceCode");
                    boolean isVerified = sourceCode != null && !sourceCode.isEmpty();
                    result.put("isVerified", isVerified);
                    result.put("riskLevel", isVerified ? "low" : "medium");

                    if (!isVerified) {
                        createAlert(userId, "UNKNOWN", contractAddress,
                                "medium", "suspicious", "Unverified contract source code");
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error checking Etherscan", e);
            result.put("riskLevel", "medium");
            result.put("error", "Could not verify with Etherscan");
        }

        // Check CryptoScamDB
        try {
            String url = cryptoScamDbBaseUrl + "/check/" + contractAddress;
            Map<String, Object> scamResponse = webClientBuilder.build()
                    .get().uri(url)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block();

            if (scamResponse != null && Boolean.TRUE.equals(scamResponse.get("success"))) {
                @SuppressWarnings("unchecked")
                Map<String, Object> entry = (Map<String, Object>) scamResponse.get("result");
                if (entry != null && entry.containsKey("type")) {
                    result.put("isScam", true);
                    result.put("riskLevel", "high");
                    result.put("scamType", entry.get("type"));

                    ScamToken token = ScamToken.builder()
                            .contractAddress(contractAddress)
                            .scamType((String) entry.get("type"))
                            .source("cryptoscamdb")
                            .build();
                    scamTokenRepository.save(token);
                }
            }
        } catch (Exception e) {
            log.warn("CryptoScamDB check failed: {}", e.getMessage());
        }

        if (!result.containsKey("isScam")) {
            result.put("isScam", false);
            if (!result.containsKey("riskLevel"))
                result.put("riskLevel", "low");
        }

        return result;
    }

    public void dismissAlert(UUID userId, UUID alertId) {
        RiskAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        if (!alert.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        alert.setIsDismissed(true);
        alertRepository.save(alert);
    }

    public void triggerRiskAssessment(UUID userId, String symbol) {
        log.info("Triggering risk assessment for user {} and symbol {}", userId, symbol);
        
        // Symbol-based patterns (e.g. if symbol contains 'SCAM' or 'RUG')
        String upperSymbol = symbol.toUpperCase();
        if (upperSymbol.contains("SCAM") || upperSymbol.contains("RUG") || upperSymbol.contains("HACK")) {
            createAlert(userId, upperSymbol, "SYMBOL_MATCH", "high", "suspicious_symbol", 
                    "Token symbol matches known risk patterns: " + upperSymbol);
            return;
        }

        // Check if this symbol matches any known scam in our database
        List<ScamToken> matches = scamTokenRepository.findBySymbol(upperSymbol);
        for (ScamToken scam : matches) {
            createAlert(userId, upperSymbol, scam.getContractAddress(), "high", "known_scam", 
                    "Holding a known malicious token: " + scam.getName() + " (" + scam.getScamType() + ")");
        }
    }

    private void createAlert(UUID userId, String symbol, String address, String level, String type, String desc) {
        // Prevent duplicate active alerts for the same token and user
        Optional<RiskAlert> existing = alertRepository.findFirstByUserIdAndTokenAddressAndIsDismissedFalse(userId, address);
        if (existing.isPresent()) {
            log.info("Active alert already exists for user {} and token {}", userId, address);
            return;
        }

        RiskAlert alert = RiskAlert.builder()
                .userId(userId)
                .symbol(symbol)
                .tokenAddress(address)
                .riskLevel(level)
                .alertType(type)
                .description(desc)
                .isDismissed(false)
                .build();
        alertRepository.save(alert);

        // Create notification for high or medium risk
        if ("high".equals(level) || "medium".equals(level)) {
            String title = "High".equals(level) ? "🚨 High Risk Token Detected" : "⚠️ Suspicious Token Detected";
            notificationService.createNotification(userId, title, 
                "Token " + symbol + " has been flagged as " + level + " risk: " + desc, "RISK");
        }
    }
}
