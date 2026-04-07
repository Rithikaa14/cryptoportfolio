package com.blockfoliox.service;

import com.blockfoliox.model.Holding;
import com.blockfoliox.repository.HoldingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HoldingService {

    private final HoldingRepository holdingRepository;
    private final RiskService riskService;

    public List<Holding> getUserHoldings(UUID userId) {
        return holdingRepository.findByUserId(userId);
    }

    public Holding createHolding(UUID userId, Holding holding) {
        holding.setUserId(userId);
        if (holding.getSymbol() != null) {
            holding.setSymbol(holding.getSymbol().toUpperCase().trim());
        }
        if (holding.getSource() == null)
            holding.setSource("manual");
        if (holding.getCurrentPrice() == null)
            holding.setCurrentPrice(holding.getAvgBuyPrice());
        
        Holding saved = holdingRepository.save(holding);
        
        // Trigger risk assessment
        if (saved.getSymbol() != null) {
            try {
                riskService.triggerRiskAssessment(userId, saved.getSymbol());
            } catch (Exception e) {
                // Log and continue
            }
        }
        
        return saved;
    }

    public Holding updateHolding(UUID userId, UUID holdingId, Holding updated) {
        Holding existing = holdingRepository.findById(holdingId)
                .orElseThrow(() -> new RuntimeException("Holding not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        if (updated.getSymbol() != null) {
            existing.setSymbol(updated.getSymbol().toUpperCase().trim());
        }
        existing.setName(updated.getName());
        existing.setQuantity(updated.getQuantity());
        existing.setAvgBuyPrice(updated.getAvgBuyPrice());
        if (updated.getCurrentPrice() != null)
            existing.setCurrentPrice(updated.getCurrentPrice());
            
        Holding saved = holdingRepository.save(existing);
        
        // Trigger risk assessment
        if (saved.getSymbol() != null) {
            try {
                riskService.triggerRiskAssessment(userId, saved.getSymbol());
            } catch (Exception e) {
                // Log and continue
            }
        }
        
        return saved;
    }

    @Transactional
    public void deleteHolding(UUID userId, UUID holdingId) {
        holdingRepository.deleteByIdAndUserId(holdingId, userId);
    }

    public BigDecimal getTotalPortfolioValue(UUID userId) {
        return getUserHoldings(userId).stream()
                .map(h -> h.getQuantity().multiply(h.getCurrentPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
