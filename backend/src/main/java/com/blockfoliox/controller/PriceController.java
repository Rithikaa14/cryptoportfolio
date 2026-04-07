package com.blockfoliox.controller;

import com.blockfoliox.model.PriceSnapshot;
import com.blockfoliox.service.PriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/prices")
@RequiredArgsConstructor
public class PriceController {

    private final PriceService priceService;

    @GetMapping
    public ResponseEntity<Map<String, BigDecimal>> getCurrentPrices(@RequestParam("symbols") String symbols) {
        List<String> symbolList = Arrays.asList(symbols.split(","));
        return ResponseEntity.ok(priceService.getCurrentPrices(symbolList));
    }

    @GetMapping("/history/{symbol}")
    public ResponseEntity<List<PriceSnapshot>> getPriceHistory(@PathVariable("symbol") String symbol,
            @RequestParam(value = "days", defaultValue = "7") int days) {
        return ResponseEntity.ok(priceService.getPriceHistory(symbol, days));
    }
}
