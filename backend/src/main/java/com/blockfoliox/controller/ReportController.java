package com.blockfoliox.controller;

import com.blockfoliox.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /** Portfolio summary (total value, realized/unrealized P&L, history) */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(Authentication auth) {
        try {
            UUID userId = (UUID) auth.getPrincipal();
            log.info("Generating summary for user: {}", userId);
            return ResponseEntity.ok(reportService.getPortfolioSummary(userId));
        } catch (Exception e) {
            log.error("CRITICAL ERROR in getSummary: {}", e.getMessage(), e);
            throw e;
        }
    }

    /** Detailed per-asset P&L breakdown (FIFO realized, unrealized, short/long-term) */
    @GetMapping("/pnl")
    public ResponseEntity<List<Map<String, Object>>> getAssetPnL(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        log.info("Generating asset P&L breakdown for user: {}", userId);
        return ResponseEntity.ok(reportService.getAssetPnLBreakdown(userId));
    }

    /** Tax summary for a given fiscal year */
    @GetMapping("/tax-summary")
    public ResponseEntity<Map<String, Object>> getTaxSummary(
            Authentication auth,
            @RequestParam(defaultValue = "0") int year) {
        UUID userId = (UUID) auth.getPrincipal();
        if (year == 0) year = LocalDate.now().getYear();
        log.info("Generating tax summary for user {} year {}", userId, year);
        return ResponseEntity.ok(reportService.getTaxSummary(userId, year));
    }

    /** Real daily portfolio value – powers the growth chart in Analytics */
    @GetMapping("/growth")
    public ResponseEntity<List<Map<String, Object>>> getPortfolioGrowth(
            Authentication auth,
            @RequestParam(defaultValue = "30") int days) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(reportService.getPortfolioGrowth(userId, days));
    }

    /** Real month-by-month % returns from FIFO trade data – powers Monthly Returns bar chart */
    @GetMapping("/monthly-returns")
    public ResponseEntity<List<Map<String, Object>>> getMonthlyReturns(
            Authentication auth,
            @RequestParam(defaultValue = "6") int months) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(reportService.getMonthlyReturns(userId, months));
    }

    /**
     * Tax-ready CSV export: holdings + full trade history (Form 8949 style) + P&L summary.
     * Supports both /export and /export/csv paths for frontend compatibility.
     */
    @GetMapping({"/export", "/export/csv"})
    public ResponseEntity<byte[]> exportCsv(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        String csv = reportService.generateCsvReport(userId);
        String filename = "blockfoliox-tax-report-" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }
}
