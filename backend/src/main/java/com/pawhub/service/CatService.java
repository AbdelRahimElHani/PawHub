package com.pawhub.service;

import com.pawhub.domain.Cat;
import com.pawhub.domain.CatPhoto;
import com.pawhub.domain.User;
import com.pawhub.repository.CatPhotoRepository;
import com.pawhub.repository.CatRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.CatDto;
import com.pawhub.web.dto.CatUpsertRequest;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class CatService {

    private final CatRepository catRepository;
    private final CatPhotoRepository catPhotoRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<CatDto> mine(SecurityUser principal) {
        return catRepository.findByUserIdOrderByCreatedAtDesc(principal.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CatDto get(Long id, SecurityUser principal) {
        Cat cat = catRepository.findById(id).orElseThrow();
        assertOwner(cat, principal);
        return toDto(cat);
    }

    @Transactional
    public CatDto create(CatUpsertRequest req, SecurityUser principal) {
        User user = userRepository.getReferenceById(principal.getId());
        Cat cat = Cat.builder()
                .user(user)
                .name(req.name())
                .breed(req.breed())
                .ageMonths(req.ageMonths())
                .gender(req.gender())
                .bio(req.bio())
                .build();
        catRepository.save(cat);
        return toDto(cat);
    }

    @Transactional
    public CatDto update(Long id, CatUpsertRequest req, SecurityUser principal) {
        Cat cat = catRepository.findById(id).orElseThrow();
        assertOwner(cat, principal);
        cat.setName(req.name());
        cat.setBreed(req.breed());
        cat.setAgeMonths(req.ageMonths());
        cat.setGender(req.gender());
        cat.setBio(req.bio());
        return toDto(cat);
    }

    @Transactional
    public void delete(Long id, SecurityUser principal) {
        Cat cat = catRepository.findById(id).orElseThrow();
        assertOwner(cat, principal);
        catRepository.delete(cat);
    }

    @Transactional
    public CatDto addPhoto(Long catId, MultipartFile file, SecurityUser principal) throws Exception {
        Cat cat = catRepository.findById(catId).orElseThrow();
        assertOwner(cat, principal);
        String url = fileStorageService.store(file, "cat");
        int order = cat.getPhotos().stream().mapToInt(CatPhoto::getSortOrder).max().orElse(-1) + 1;
        CatPhoto photo = CatPhoto.builder().cat(cat).url(url).sortOrder(order).build();
        catPhotoRepository.save(photo);
        cat.getPhotos().add(photo);
        return toDto(catRepository.findById(catId).orElseThrow());
    }

    private void assertOwner(Cat cat, SecurityUser principal) {
        if (!cat.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your cat");
        }
    }

    private CatDto toDto(Cat cat) {
        List<String> urls = cat.getPhotos().stream()
                .sorted(Comparator.comparingInt(CatPhoto::getSortOrder))
                .map(CatPhoto::getUrl)
                .toList();
        return new CatDto(
                cat.getId(),
                cat.getName(),
                cat.getBreed(),
                cat.getAgeMonths(),
                cat.getGender() != null ? cat.getGender().name() : null,
                cat.getBio(),
                urls);
    }
}
