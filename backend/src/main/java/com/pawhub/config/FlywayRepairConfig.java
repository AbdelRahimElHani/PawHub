package com.pawhub.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Runs {@link Flyway#repair()} before {@link Flyway#migrate()} when
 * {@code spring.flyway.repair-on-migrate=true}, so checksum updates are applied before validation.
 *
 * <p>After migration files were <strong>renumbered</strong>, old {@code flyway_schema_history} rows may not
 * match the SQL that was actually applied. Repair only fixes checksums — for a wrong schema, drop the
 * database (see {@code backend/scripts/reset-pawhub-database.sql}) and migrate again.
 */
@Configuration
public class FlywayRepairConfig {

    @Bean
    FlywayMigrationStrategy flywayMigrationStrategy(Environment env) {
        boolean repairFirst =
                env.getProperty("spring.flyway.repair-on-migrate", Boolean.class, false);
        if (!repairFirst) {
            return Flyway::migrate;
        }
        return f -> {
            f.repair();
            f.migrate();
        };
    }
}
