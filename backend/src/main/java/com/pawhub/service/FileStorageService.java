package com.pawhub.service;

import com.pawhub.config.PawhubProperties;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final PawhubProperties props;
    private Path root;

    @PostConstruct
    void init() throws IOException {
        root = Path.of(props.getUploadDir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public String store(MultipartFile file, String prefix) throws IOException {
        String ext = "";
        String original = file.getOriginalFilename();
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf('.'));
        }
        String name = prefix + "-" + UUID.randomUUID() + ext;
        Path target = root.resolve(name);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return props.getPublicBaseUrl() + "/api/files/" + name;
    }

    /**
     * Reads a file previously stored with {@link #store}, using the public URL that method returned.
     */
    public Optional<byte[]> readByPublicFileUrl(String publicUrl) throws IOException {
        if (publicUrl == null || publicUrl.isBlank()) {
            return Optional.empty();
        }
        String prefix = props.getPublicBaseUrl() + "/api/files/";
        String filename;
        if (publicUrl.startsWith(prefix)) {
            filename = publicUrl.substring(prefix.length());
        } else {
            int idx = publicUrl.indexOf("/api/files/");
            if (idx < 0) {
                return Optional.empty();
            }
            filename = publicUrl.substring(idx + "/api/files/".length());
        }
        if (filename.isBlank()
                || filename.contains("..")
                || filename.indexOf('/') >= 0
                || filename.indexOf('\\') >= 0) {
            return Optional.empty();
        }
        if (!filename.matches("^[a-zA-Z0-9._-]+$")) {
            return Optional.empty();
        }
        Path target = root.resolve(filename).normalize();
        if (!target.startsWith(root) || !Files.isRegularFile(target)) {
            return Optional.empty();
        }
        return Optional.of(Files.readAllBytes(target));
    }
}
