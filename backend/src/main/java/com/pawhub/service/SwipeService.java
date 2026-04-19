package com.pawhub.service;

import com.pawhub.domain.*;
import com.pawhub.domain.CatGender;
import com.pawhub.repository.*;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.SwipeRequest;
import com.pawhub.web.dto.SwipeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SwipeService {

    private final CatRepository catRepository;
    private final SwipeRepository swipeRepository;
    private final PawMatchRepository pawMatchRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final UserRepository userRepository;

    @Transactional
    public SwipeResponse swipe(SwipeRequest req, SecurityUser principal) {
        Cat myCat = catRepository.findById(req.myCatId()).orElseThrow();
        if (!myCat.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your cat");
        }
        Cat target = catRepository.findById(req.targetCatId()).orElseThrow();
        if (myCat.getId().equals(target.getId())) {
            throw new IllegalArgumentException("Cannot swipe yourself");
        }
        if (swipeRepository.findByCatIdAndTargetCatId(myCat.getId(), target.getId()).isPresent()) {
            throw new IllegalArgumentException("Already swiped");
        }
        Swipe swipe =
                Swipe.builder().cat(myCat).targetCat(target).direction(req.direction()).build();
        swipeRepository.save(swipe);

        boolean matched = false;
        Long threadId = null;
        if (req.direction() == SwipeDirection.LIKE) {
            boolean otherLiked = swipeRepository.existsByCatIdAndTargetCatIdAndDirection(
                    target.getId(), myCat.getId(), SwipeDirection.LIKE);
            if (otherLiked && pawMatchRepository.findByCatPair(myCat.getId(), target.getId()).isEmpty()) {
                User u1 = userRepository.getReferenceById(myCat.getUser().getId());
                User u2 = userRepository.getReferenceById(target.getUser().getId());
                User p1 = u1.getId() < u2.getId() ? u1 : u2;
                User p2 = u1.getId() < u2.getId() ? u2 : u1;
                ChatThread thread = ChatThread.builder()
                        .type(ThreadType.MATCH)
                        .participantOne(p1)
                        .participantTwo(p2)
                        .build();
                chatThreadRepository.save(thread);
                Cat catA = myCat.getId() < target.getId() ? myCat : target;
                Cat catB = myCat.getId() < target.getId() ? target : myCat;
                PawMatch match = PawMatch.builder().catA(catA).catB(catB).thread(thread).build();
                pawMatchRepository.save(match);
                thread.setMatchId(match.getId());
                chatThreadRepository.save(thread);
                matched = true;
                threadId = thread.getId();
            } else if (otherLiked) {
                matched = true;
                threadId = pawMatchRepository
                        .findByCatPair(myCat.getId(), target.getId())
                        .map(m -> m.getThread().getId())
                        .orElse(null);
            }
        }
        return new SwipeResponse(matched, threadId);
    }

    @Transactional(readOnly = true)
    public com.pawhub.web.dto.CatCardDto nextCandidate(Long myCatId, SecurityUser principal) {
        Cat myCat = catRepository.findById(myCatId).orElseThrow();
        if (!myCat.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your cat");
        }
        boolean myIsMale = myCat.getGender() == CatGender.MALE;
        return catRepository
                .findCandidates(myCatId, principal.getId())
                .stream()
                .filter(c -> !myIsMale || c.getGender() != CatGender.MALE)
                .findFirst()
                .map(c -> new com.pawhub.web.dto.CatCardDto(
                        c.getId(),
                        c.getName(),
                        c.getBreed(),
                        c.getAgeMonths(),
                        c.getGender() != null ? c.getGender().name() : null,
                        c.getBio(),
                        c.getPhotos().isEmpty()
                                ? null
                                : c.getPhotos().stream()
                                        .min(java.util.Comparator.comparingInt(CatPhoto::getSortOrder))
                                        .map(CatPhoto::getUrl)
                                        .orElse(null),
                        c.getUser().getDisplayName()))
                .orElse(null);
    }
}
