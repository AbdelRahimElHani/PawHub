package com.pawhub.security;

import com.pawhub.config.PawhubProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final PawhubProperties props;
    private final SecretKey key;

    public JwtService(PawhubProperties props) {
        this.props = props;
        this.key = hmacSigningKey(props.getJwt().getSecret());
    }

    /** JJWT requires HS256 signing keys ≥ 256 bits; short secrets are stretched with SHA-256 (dev-safe). */
    private static SecretKey hmacSigningKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "pawhub.jwt.secret is unset. Set JWT_SECRET or pawhub.jwt.secret (use at least 32 random characters in production).");
        }
        byte[] utf8 = secret.getBytes(StandardCharsets.UTF_8);
        if (utf8.length >= 32) {
            return Keys.hmacShaKeyFor(utf8);
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return Keys.hmacShaKeyFor(md.digest(utf8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public String generateToken(Long userId, String email) {
        long now = System.currentTimeMillis();
        long exp = now + props.getJwt().getExpirationMs();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(new Date(now))
                .expiration(new Date(exp))
                .signWith(key)
                .compact();
    }

    public Long parseUserId(String token) {
        Claims claims =
                Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        return Long.parseLong(claims.getSubject());
    }
}
