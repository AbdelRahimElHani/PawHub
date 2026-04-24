package com.pawhub.service;

import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.Cat;
import com.pawhub.domain.CatPhoto;
import com.pawhub.domain.MatchBehaviorPreference;
import com.pawhub.domain.MatchGenderPreference;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CatService {

    private final CatRepository catRepository;
    private final CatPhotoRepository catPhotoRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final AppNotificationService appNotificationService;

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
        validateCatPreferences(req.prefMinAgeMonths(), req.prefMaxAgeMonths());
        User user = userRepository.getReferenceById(principal.getId());
        MatchGenderPreference prefGender =
                req.prefLookingForGender() != null ? req.prefLookingForGender() : MatchGenderPreference.ANY;
        MatchBehaviorPreference prefBeh =
                req.prefBehavior() != null ? req.prefBehavior() : MatchBehaviorPreference.ANY;
        Cat cat = Cat.builder()
                .user(user)
                .name(req.name())
                .breed(req.breed())
                .ageMonths(req.ageMonths())
                .gender(req.gender())
                .bio(req.bio())
                .prefLookingForGender(prefGender)
                .prefMinAgeMonths(req.prefMinAgeMonths())
                .prefMaxAgeMonths(req.prefMaxAgeMonths())
                .behavior(req.behavior())
                .prefBehavior(prefBeh)
                .prefBreed(normalizeBreedPref(req.prefBreed()))
                .build();
        catRepository.save(cat);
        appNotificationService.publish(
                principal.getId(),
                AppNotificationKind.HEALTH_REMINDER,
                "Health reminder",
                String.format(
                        "%s is due for a Rabies vaccination check-in soon — confirm the date with your veterinarian.",
                        cat.getName()),
                "/cats/" + cat.getId(),
                "health",
                null);
        return toDto(cat);
    }

    @Transactional
    public CatDto update(Long id, CatUpsertRequest req, SecurityUser principal) {
        validateCatPreferences(req.prefMinAgeMonths(), req.prefMaxAgeMonths());
        Cat cat = catRepository.findById(id).orElseThrow();
        assertOwner(cat, principal);
        cat.setName(req.name());
        cat.setBreed(req.breed());
        cat.setAgeMonths(req.ageMonths());
        cat.setGender(req.gender());
        cat.setBio(req.bio());
        cat.setPrefLookingForGender(
                req.prefLookingForGender() != null ? req.prefLookingForGender() : MatchGenderPreference.ANY);
        cat.setPrefMinAgeMonths(req.prefMinAgeMonths());
        cat.setPrefMaxAgeMonths(req.prefMaxAgeMonths());
        cat.setBehavior(req.behavior());
        cat.setPrefBehavior(req.prefBehavior() != null ? req.prefBehavior() : MatchBehaviorPreference.ANY);
        cat.setPrefBreed(normalizeBreedPref(req.prefBreed()));
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

    private void validateCatPreferences(Integer minAge, Integer maxAge) {
        if (minAge != null && maxAge != null && minAge > maxAge) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "PawMatch age range: minimum cannot be greater than maximum");
        }
    }

    /** Empty or blank -> null (any breed). */
    private static String normalizeBreedPref(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
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
                urls,
                cat.getPrefLookingForGender() != null ? cat.getPrefLookingForGender().name() : MatchGenderPreference.ANY.name(),
                cat.getPrefMinAgeMonths(),
                cat.getPrefMaxAgeMonths(),
                cat.getBehavior() != null ? cat.getBehavior().name() : null,
                cat.getPrefBehavior() != null ? cat.getPrefBehavior().name() : MatchBehaviorPreference.ANY.name(),
                cat.getPrefBreed());
    }
}
