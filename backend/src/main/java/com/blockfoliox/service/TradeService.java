package com.blockfoliox.service;

import com.blockfoliox.model.Holding;
import com.blockfoliox.model.Trade;
import com.blockfoliox.repository.HoldingRepository;
import com.blockfoliox.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TradeService {

    private final TradeRepository tradeRepository;
    private final HoldingRepository holdingRepository;
    private final PriceService priceService;
    private final RiskService riskService;
    private final NotificationService notificationService;

    @Transactional
    public List<Trade> getUserTrades(UUID userId) {
        return tradeRepository.findByUserIdOrderByTradedAtDesc(userId);
    }

    public List<Trade> getRecentTrades(UUID userId, int limit) {
        return getRecentTrades(userId, limit, false);
    }

    public List<Trade> getRecentTrades(UUID userId, int limit, boolean todayOnly) {
        if (todayOnly) {
            java.time.OffsetDateTime todayStart = java.time.OffsetDateTime.now()
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
            return tradeRepository.findByUserIdAndTradedAtAfterOrderByTradedAtDesc(userId, todayStart);
        }
        return tradeRepository.findAllByUserIdOrderByTradedAtDesc(userId, PageRequest.of(0, limit)).getContent();
    }

    @Transactional
    public Trade createTrade(UUID userId, Trade trade) {
        log.info("Creating trade for user: {}, symbol: {}, side: {}, quantity: {}, price: {}", 
                userId, trade.getSymbol(), trade.getSide(), trade.getQuantity(), trade.getPrice());
        
        trade.setUserId(userId);
        BigDecimal quantity = trade.getQuantity();
        BigDecimal price = trade.getPrice();
        BigDecimal total = quantity.multiply(price);
        trade.setTotal(total);
        log.info("Calculated trade total: {}", total);
        
        if (trade.getSource() == null)
            trade.setSource("manual");

        String symbol = trade.getSymbol().toUpperCase().trim();
        trade.setSymbol(symbol);

        // 1. Market Verification (Check if the coin really exists)
        Map<String, BigDecimal> marketPrices = priceService.getCurrentPrices(List.of(symbol));
        if (marketPrices == null || !marketPrices.containsKey(symbol)) {
            log.warn("Trade rejected: Symbol {} not found in market.", symbol);
            throw new IllegalArgumentException("Coin symbol " + symbol + " not found in market.");
        }

        // 2. Balance Validation (Check if user has enough to sell)
        List<Holding> holdings = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        BigDecimal currentQty = holdings.isEmpty() ? BigDecimal.ZERO : holdings.get(0).getQuantity();

        if ("sell".equalsIgnoreCase(trade.getSide())) {
            if (currentQty.compareTo(quantity) < 0) {
                log.warn("Trade rejected: Insufficient balance for {}. Required: {}, Available: {}", 
                        symbol, quantity, currentQty);
                throw new IllegalArgumentException("Insufficient balance for " + symbol + ". Available: " + currentQty);
            }
        }

        Trade savedTrade = tradeRepository.save(trade);
        log.info("Saved trade ID: {}", savedTrade.getId());

        // Update Holding
        log.info("Found {} existing holdings for symbol {}", holdings.size(), symbol);
        
        Holding holding;
        
        if (holdings.isEmpty()) {
            log.info("Creating new holding for symbol {}", symbol);
            holding = Holding.builder()
                        .userId(userId)
                        .symbol(symbol)
                        .name(symbol)
                        .quantity(BigDecimal.ZERO)
                        .avgBuyPrice(BigDecimal.ZERO)
                        .source("trade-history")
                        .build();
        } else {
            // Merge duplicates if they exist (caused by previous symbol casing bugs)
            holding = holdings.get(0);
            if (holdings.size() > 1) {
                log.warn("Found multiple holdings for symbol {}, merging...", symbol);
                BigDecimal totalQty = BigDecimal.ZERO;
                BigDecimal totalCostValue = BigDecimal.ZERO;
                for (int i = 0; i < holdings.size(); i++) {
                    Holding h = holdings.get(i);
                    totalQty = totalQty.add(h.getQuantity());
                    totalCostValue = totalCostValue.add(h.getQuantity().multiply(h.getAvgBuyPrice()));
                    if (i > 0) holdingRepository.delete(h);
                }
                holding.setQuantity(totalQty);
                if (totalQty.compareTo(BigDecimal.ZERO) > 0) {
                    holding.setAvgBuyPrice(totalCostValue.divide(totalQty, 8, RoundingMode.HALF_UP));
                }
            }
        }

        // Always update current price to the latest trade price for immediate feedback
        holding.setCurrentPrice(price);

        BigDecimal fee = trade.getFee() != null ? trade.getFee() : BigDecimal.ZERO;
        
        if ("buy".equalsIgnoreCase(trade.getSide())) {
            // Cost basis includes the fee: (Qty * Price) + Fee
            BigDecimal tradeCostWithFee = trade.getTotal().add(fee);
            BigDecimal totalCost = holding.getQuantity().multiply(holding.getAvgBuyPrice())
                    .add(tradeCostWithFee);
            BigDecimal newQuantity = holding.getQuantity().add(quantity);
            
            if (newQuantity.compareTo(BigDecimal.ZERO) > 0) {
                holding.setAvgBuyPrice(totalCost.divide(newQuantity, 8, RoundingMode.HALF_UP));
            }
            holding.setQuantity(newQuantity);
            log.info("Updated holding for BUY: new quantity={}, new avgBuyPrice={}", 
                    holding.getQuantity(), holding.getAvgBuyPrice());
        } else if ("sell".equalsIgnoreCase(trade.getSide())) {
            holding.setQuantity(holding.getQuantity().subtract(quantity));
            log.info("Updated holding for SELL: new quantity={}", holding.getQuantity());
        }

        Holding savedHolding = holdingRepository.save(holding);
        log.info("Saved holding ID: {}, symbol: {}, final quantity: {}", 
                savedHolding.getId(), savedHolding.getSymbol(), savedHolding.getQuantity());
        
        // Trigger risk assessment asynchronously (conceptually)
        try {
            riskService.triggerRiskAssessment(userId, symbol);
        } catch (Exception e) {
            log.warn("Failed to trigger risk assessment: {}", e.getMessage());
        }

        // Create success notification
        String side = trade.getSide();
        String tradeTypeDisplay = "buy".equalsIgnoreCase(side) ? "Bought" : "Sold";
        notificationService.createNotification(userId, "📋 Trade Recorded", 
            tradeTypeDisplay + " " + quantity + " " + symbol + " successfully.", "SUCCESS");

        return savedTrade;
    }

    @Transactional
    public void recalculateHoldings(UUID userId) {
        log.info("Recalculating all holdings for user: {}", userId);
        
        // 1. Get all trades in chronological order
        List<Trade> trades = tradeRepository.findByUserIdOrderByTradedAtAsc(userId);
        
        // 2. Clear current holdings (or prepare to update them)
        List<Holding> currentHoldings = holdingRepository.findByUserId(userId);
        
        // Map to keep track of new holding values
        // Symbol -> [Total Quantity, Total CostBasis]
        Map<String, BigDecimal[]> recalculated = new java.util.HashMap<>();
        
        for (Trade t : trades) {
            String sym = t.getSymbol().toUpperCase();
            recalculated.putIfAbsent(sym, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            
            BigDecimal[] values = recalculated.get(sym);
            BigDecimal currentQty = values[0];
            BigDecimal currentCostBasis = values[1];
            
            BigDecimal tradeQty = t.getQuantity();
            BigDecimal tradeTotal = t.getTotal();
            BigDecimal fee = t.getFee() != null ? t.getFee() : BigDecimal.ZERO;

            if ("buy".equalsIgnoreCase(t.getSide())) {
                BigDecimal newQty = currentQty.add(tradeQty);
                BigDecimal newCostBasis = currentCostBasis.add(tradeTotal).add(fee);
                recalculated.put(sym, new BigDecimal[]{newQty, newCostBasis});
            } else if ("sell".equalsIgnoreCase(t.getSide())) {
                BigDecimal newQty = currentQty.subtract(tradeQty);
                // For weighted average, selling doesn't change the avg cost basis per unit, just total volume
                // But we need to track cost basis for remaining quantity
                if (currentQty.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal avgCost = currentCostBasis.divide(currentQty, 8, RoundingMode.HALF_UP);
                    BigDecimal newCostBasis = newQty.compareTo(BigDecimal.ZERO) > 0 
                            ? newQty.multiply(avgCost) 
                            : BigDecimal.ZERO;
                    recalculated.put(sym, new BigDecimal[]{newQty, newCostBasis});
                } else {
                    recalculated.put(sym, new BigDecimal[]{newQty, BigDecimal.ZERO});
                }
            }
        }
        
        // 3. Update the database
        // Delete holdings that no longer exist in history
        for (Holding h : currentHoldings) {
            if (!recalculated.containsKey(h.getSymbol().toUpperCase())) {
                holdingRepository.delete(h);
            }
        }
        
        // Update or create remaining
        for (Map.Entry<String, BigDecimal[]> entry : recalculated.entrySet()) {
            String sym = entry.getKey();
            BigDecimal qty = entry.getValue()[0];
            BigDecimal costBasis = entry.getValue()[1];
            BigDecimal avgPrice = (qty.compareTo(BigDecimal.ZERO) > 0) 
                    ? costBasis.divide(qty, 8, RoundingMode.HALF_UP) 
                    : BigDecimal.ZERO;
            
            Holding holding = holdingRepository.findByUserIdAndSymbol(userId, sym).stream().findFirst().orElse(
                Holding.builder().userId(userId).symbol(sym).name(sym).build()
            );
            
            holding.setQuantity(qty);
            holding.setAvgBuyPrice(avgPrice);
            holding.setSource("recalculation");
            
            // Set a default current price if missing
            if (holding.getCurrentPrice() == null) {
                holding.setCurrentPrice(avgPrice);
            }
            
            
            holdingRepository.save(holding);

            // Sync 7 days of historical price data for this coin to populate the chart
            try {
                priceService.syncHistoricalPrices(sym, 7);
                // Tiny delay to respect CoinGecko basic rate limit
                try { Thread.sleep(150); } catch (InterruptedException e) {}
            } catch (Exception e) {
                log.warn("Failed to trigger historical sync for {}: {}", sym, e.getMessage());
            }
        }
        
        log.info("Recalculation complete for user: {}", userId);
    }
}
