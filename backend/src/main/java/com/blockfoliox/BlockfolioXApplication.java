package com.blockfoliox;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BlockfolioXApplication {

    public static void main(String[] args) {
        SpringApplication.run(BlockfolioXApplication.class, args);
    }
}
