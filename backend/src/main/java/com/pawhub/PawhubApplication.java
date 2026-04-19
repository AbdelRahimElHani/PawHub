package com.pawhub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PawhubApplication {

    public static void main(String[] args) {
        SpringApplication.run(PawhubApplication.class, args);
    }
}
