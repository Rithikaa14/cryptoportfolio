package com.blockfoliox.service;

import com.blockfoliox.model.PriceSnapshot;
import com.blockfoliox.repository.HoldingRepository;
import com.blockfoliox.repository.PriceSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceService {

    private final PriceSnapshotRepository snapshotRepository;
    private final HoldingRepository holdingRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.coingecko.base-url}")
    private String coingeckoBaseUrl;

    @Value("${app.coingecko.api-key:}")
    private String coingeckoApiKey;

    @Value("${app.binance.base-url:https://api.binance.com}")
    private String binanceBaseUrl;

    // Symbol to CoinGecko ID mapping
    private static final Map<String, String> SYMBOL_MAP = new HashMap<>();

    static {
        SYMBOL_MAP.put("BTC", "bitcoin");
        SYMBOL_MAP.put("ETH", "ethereum");
        SYMBOL_MAP.put("SOL", "solana");
        SYMBOL_MAP.put("ADA", "cardano");
        SYMBOL_MAP.put("DOGE", "dogecoin");
        SYMBOL_MAP.put("AVAX", "avalanche-2");
        SYMBOL_MAP.put("DOT", "polkadot");
        SYMBOL_MAP.put("LINK", "chainlink");
        SYMBOL_MAP.put("BNB", "binancecoin");
        SYMBOL_MAP.put("MATIC", "polygon");
        SYMBOL_MAP.put("XRP", "ripple");
        SYMBOL_MAP.put("USDC", "usd-coin");
        SYMBOL_MAP.put("USDT", "tether");
        SYMBOL_MAP.put("ETC", "ethereum-classic");
        SYMBOL_MAP.put("LTC", "litecoin");
        SYMBOL_MAP.put("BCH", "bitcoin-cash");
        SYMBOL_MAP.put("SHIB", "shiba-inu");
        SYMBOL_MAP.put("SOLANA", "solana");
        SYMBOL_MAP.put("BITCOIN", "bitcoin");
        SYMBOL_MAP.put("ETHEREUM", "ethereum");
        SYMBOL_MAP.put("EHEREUM", "ethereum"); // Fix user typo
    }

    private String getCoinGeckoId(String symbol) {
        if (symbol == null) return null;
        String clean = symbol.toUpperCase().trim();
        // Handle BTC-USD, binance:BTC, BTC/USD
        String base = clean.split("[-/:]")[0];
        return SYMBOL_MAP.getOrDefault(base, clean.toLowerCase());
    }

    private static final ParameterizedTypeReference<Map<String, Map<String, Number>>> COINGECKO_RESPONSE_TYPE = new ParameterizedTypeReference<Map<String, Map<String, Number>>>() {
    };

    public Map<String, BigDecimal> getCurrentPrices(List<String> symbols) {
        Map<String, BigDecimal> prices = new HashMap<>();
        try {
            List<String> ids = symbols.stream()
                    .map(this::getCoinGeckoId)
                    .filter(Objects::nonNull)
                    .toList();

            String url = coingeckoBaseUrl + "/simple/price?ids=" + String.join(",", ids) + "&vs_currencies=usd";
            log.info("Fetching LIVE current prices from CoinGecko: {}", url);

            Map<String, Map<String, Number>> response = webClientBuilder.build()
                    .get().uri(url)
                    .retrieve()
                    .bodyToMono(COINGECKO_RESPONSE_TYPE)
                    .block();

            if (response != null) {
                for (String symbol : symbols) {
                    String id = getCoinGeckoId(symbol);
                    Map<String, Number> data = response.get(id);
                    if (data != null && data.get("usd") != null) {
                        prices.put(symbol.toUpperCase(), BigDecimal.valueOf(data.get("usd").doubleValue()));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error fetching prices from CoinGecko, attempting Binance fallback", e);
            // Fallback for major symbols
            for (String symbol : symbols) {
                if (!prices.containsKey(symbol.toUpperCase())) {
                    BigDecimal binancePrice = getBinancePrice(symbol);
                    if (binancePrice != null) {
                        prices.put(symbol.toUpperCase(), binancePrice);
                    }
                }
            }
        }
        return prices;
    }

    public BigDecimal getBinancePrice(String symbol) {
        try {
            String clean = symbol.toUpperCase().trim();
            // Binance usually uses USDT for stable pairs
            String binanceSymbol = clean + "USDT";
            
            // Special cases
            if (clean.equals("USDT")) return BigDecimal.ONE;
            if (clean.equals("USDC")) return BigDecimal.ONE;

            String url = binanceBaseUrl + "/api/v3/ticker/price?symbol=" + binanceSymbol;
            
            Map<String, String> response = webClientBuilder.build()
                    .get().uri(url)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, String>>() {})
                    .block();

            if (response != null && response.get("price") != null) {
                log.info("Fetched price for {} from Binance: {}", symbol, response.get("price"));
                return new BigDecimal(response.get("price"));
            }
        } catch (Exception e) {
            log.warn("Binance fallback failed for {}: {}", symbol, e.getMessage());
        }
        return null;
    }

    public BigDecimal getHistoricalPrice(String symbol, OffsetDateTime dateTime) {
        try {
            String id = getCoinGeckoId(symbol);
            if (id == null) return null;
            // Date format for CoinGecko: dd-mm-yyyy
            String dateStr = String.format("%02d-%02d-%d", 
                dateTime.getDayOfMonth(), dateTime.getMonthValue(), dateTime.getYear());

            String url = coingeckoBaseUrl + "/coins/" + id + "/history?date=" + dateStr + "&localization=false";
            log.info("Fetching HISTORICAL price from CoinGecko for {} on {}: {}", symbol, dateStr, url);
            
            Map<String, Object> response = webClientBuilder.build()
                    .get().uri(url)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (response != null && response.get("market_data") != null) {
                Map<String, Object> marketData = (Map<String, Object>) response.get("market_data");
                Map<String, Number> currentPrice = (Map<String, Number>) marketData.get("current_price");
                if (currentPrice != null && currentPrice.get("usd") != null) {
                    return BigDecimal.valueOf(currentPrice.get("usd").doubleValue());
                }
            }
        } catch (Exception e) {
            log.error("Error fetching historical price for {} at {}", symbol, dateTime, e);
        }
        return null;
    }

    public List<PriceSnapshot> getPriceHistory(String symbol, int days) {
        int limit = days * 24; // hourly snapshots
        return snapshotRepository.findBySymbolOrderByRecordedAtDesc(symbol.toUpperCase(), PageRequest.of(0, limit));
    }

    @Scheduled(fixedDelayString = "${app.scheduler.price-snapshot-interval:300000}")
    public void takePriceSnapshots() {
        log.info("Taking price snapshots...");
        // Fetch all unique symbols from holdings to ensure we have prices for everything users own
        List<String> symbols = holdingRepository.findAll().stream()
                .map(h -> h.getSymbol().toUpperCase())
                .distinct()
                .toList();

        if (symbols.isEmpty()) {
            symbols = new ArrayList<>(SYMBOL_MAP.keySet());
        }

        Map<String, BigDecimal> prices = getCurrentPrices(symbols);
        prices.forEach((symbol, price) -> {
            // Save snapshot
            PriceSnapshot snapshot = PriceSnapshot.builder()
                    .symbol(symbol)
                    .price(price)
                    .build();
            snapshotRepository.save(snapshot);

            // Update all holdings with this symbol to the latest current price
            List<com.blockfoliox.model.Holding> holdings = holdingRepository.findAll().stream()
                    .filter(h -> h.getSymbol().equalsIgnoreCase(symbol))
                    .toList();
            
            for (com.blockfoliox.model.Holding h : holdings) {
                h.setCurrentPrice(price);
                holdingRepository.save(h);
            }
        });
        log.info("Saved {} price snapshots and updated holdings", prices.size());
    }

    /**
     * Fetches the last 7 days of historical prices and saves daily close snapshots.
     * This uses the market_chart/range API (highly efficient).
     */
    public void syncHistoricalPrices(String symbol, int days) {
        try {
            String id = getCoinGeckoId(symbol);
            if (id == null) return;

            long end = OffsetDateTime.now().toEpochSecond();
            long start = end - (days * 24 * 60 * 60);

            String url = coingeckoBaseUrl + "/coins/" + id + "/market_chart/range?vs_currency=usd&from=" + start + "&to=" + end;
            log.info("Syncing HISTORICAL RANGE for {}: {}", symbol, url);

            Map<String, Object> response = webClientBuilder.build()
                    .get().uri(url)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (response != null && response.get("prices") != null) {
                List<List<Number>> priceData = (List<List<Number>>) response.get("prices");
                
                // Group by day to get the "close" for each day
                Map<String, Number[]> dailyClose = new HashMap<>(); // dateStr -> [timestamp, price]
                
                for (List<Number> point : priceData) {
                    long ts = point.get(0).longValue();
                    double price = point.get(1).doubleValue();
                    
                    OffsetDateTime dt = OffsetDateTime.ofInstant(java.time.Instant.ofEpochMilli(ts), ZoneOffset.UTC);
                    String dayKey = dt.toLocalDate().toString();
                    
                    // Keep the latest point for each day
                    if (!dailyClose.containsKey(dayKey) || ts > dailyClose.get(dayKey)[0].longValue()) {
                        dailyClose.put(dayKey, new Number[]{ts, price});
                    }
                }

                log.info("Discovered {} historical days for {}. Saving snapshots...", dailyClose.size(), symbol);
                
                for (Number[] data : dailyClose.values()) {
                    long ts = data[0].longValue();
                    double price = data[1].doubleValue();
                    OffsetDateTime dt = OffsetDateTime.ofInstant(java.time.Instant.ofEpochMilli(ts), ZoneOffset.UTC);

                    // Avoid duplicates if we already have a snapshot near this time
                    Optional<PriceSnapshot> existing = snapshotRepository.findTopBySymbolAndRecordedAtBeforeOrderByRecordedAtDesc(
                            symbol.toUpperCase(), dt.plusMinutes(5));
                    
                    if (existing.isPresent() && 
                        Math.abs(existing.get().getRecordedAt().toEpochSecond() - dt.toEpochSecond()) < 3600) {
                        continue; // Already have a snapshot for this hour
                    }

                    PriceSnapshot snapshot = PriceSnapshot.builder()
                            .symbol(symbol.toUpperCase())
                            .price(BigDecimal.valueOf(price))
                            .recordedAt(dt)
                            .build();
                    snapshotRepository.save(snapshot);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to sync historical range for {}: {}", symbol, e.getMessage());
        }
    }
}
