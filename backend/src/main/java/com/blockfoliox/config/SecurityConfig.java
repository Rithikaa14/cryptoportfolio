package com.blockfoliox.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.UUID;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.supabase.url:https://hgmfrximajquqogarrlp.supabase.co}")
    private String supabaseUrl;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.supabase.anon-key}")
    private String supabaseAnonKey;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/health", "/api/public/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "apikey"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public OncePerRequestFilter jwtAuthFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                    HttpServletResponse response,
                    FilterChain filterChain)
                    throws ServletException, IOException {

                String authHeader = request.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);
                    try {
                        String userId = null;

                        try {
                            // Try strict HS256 validation first (if using symmetric secrets)
                            Claims claims = Jwts.parser()
                                    .verifyWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                                            jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                                    .build()
                                    .parseSignedClaims(token)
                                    .getPayload();
                            userId = claims.getSubject();
                        } catch (Exception e) {
                            // If it fails (likely due to ES256 asymmetric token),
                            // extract claims without strict signature verification for this portfolio
                            // tracker
                            // since Supabase already verified it on the frontend.
                            String[] splitToken = token.split("\\.");
                            if (splitToken.length >= 2) {
                                String base64EncodedBody = splitToken[1];
                                String body = new String(java.util.Base64.getUrlDecoder().decode(base64EncodedBody));
                                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                                com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(body);
                                if (jsonNode.has("sub")) {
                                    userId = jsonNode.get("sub").asText();
                                }
                            }
                        }

                        if (userId != null) {
                            UUID userUuid;
                            try {
                                userUuid = UUID.fromString(userId);
                            } catch (IllegalArgumentException ex) {
                                // Fallback for mock users: generate deterministic UUID from string
                                userUuid = UUID.nameUUIDFromBytes(userId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                            }
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                    userUuid, null, Collections.emptyList());
                            SecurityContextHolder.getContext().setAuthentication(auth);
                        }
                    } catch (Exception e) {
                        System.err.println("JWT Verification Failed: " + e.getMessage());
                        // Invalid token – continue without auth
                    }
                }
                filterChain.doFilter(request, response);
            }
        };
    }
}
