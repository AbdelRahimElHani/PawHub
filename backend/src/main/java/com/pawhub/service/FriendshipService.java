package com.pawhub.service;

import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.ChatThread;
import com.pawhub.domain.FriendshipStatus;
import com.pawhub.domain.ThreadType;
import com.pawhub.domain.User;
import com.pawhub.domain.UserFriendship;
import com.pawhub.repository.ChatThreadRepository;
import com.pawhub.repository.UserFriendshipRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.DiscoverUserDto;
import com.pawhub.web.dto.FriendDirectoryUserDto;
import com.pawhub.web.dto.PublicProfileRelationship;
import com.pawhub.web.dto.PublicUserProfileDto;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private static final int DISCOVER_LIMIT = 50;
    private static final int WEIGHT_CITY = 3;
    private static final int WEIGHT_REGION = 2;
    private static final int WEIGHT_ACCOUNT_TYPE = 1;
    private static final int WEIGHT_MUTUAL = 2;

    private final UserFriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final AppNotificationService appNotificationService;

    private record Pair(long low, long high) {}

    private static Pair pair(long a, long b) {
        if (a == b) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot use the same user twice.");
        }
        return a < b ? new Pair(a, b) : new Pair(b, a);
    }

    @Transactional(readOnly = true)
    public PublicUserProfileDto publicProfile(long targetUserId, SecurityUser viewer) {
        if (Objects.equals(viewer.getId(), targetUserId)) {
            User u = userRepository.findById(viewer.getId()).orElseThrow();
            return toPublicDto(u, PublicProfileRelationship.SELF);
        }
        User target =
                userRepository.findById(targetUserId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return toPublicDto(target, relationship(viewer.getId(), targetUserId));
    }

    private static PublicUserProfileDto toPublicDto(User u, PublicProfileRelationship rel) {
        return new PublicUserProfileDto(
                u.getId(),
                u.getDisplayName(),
                u.getAvatarUrl(),
                u.getProfileCity(),
                u.getProfileRegion(),
                u.getProfileBio(),
                u.getAccountType() != null ? u.getAccountType().name() : null,
                rel);
    }

    @Transactional(readOnly = true)
    public PublicProfileRelationship relationship(long viewerId, long targetUserId) {
        if (viewerId == targetUserId) {
            return PublicProfileRelationship.SELF;
        }
        Pair p = pair(viewerId, targetUserId);
        return friendshipRepository
                .findByUserLow_IdAndUserHigh_Id(p.low, p.high)
                .map(f -> mapRelationship(f, viewerId))
                .orElse(PublicProfileRelationship.NONE);
    }

    private static PublicProfileRelationship mapRelationship(UserFriendship f, long viewerId) {
        if (f.getStatus() == FriendshipStatus.ACCEPTED) {
            return PublicProfileRelationship.FRIENDS;
        }
        if (f.getStatus() == FriendshipStatus.PENDING) {
            if (Objects.equals(f.getInitiator().getId(), viewerId)) {
                return PublicProfileRelationship.OUTGOING_PENDING;
            }
            return PublicProfileRelationship.INCOMING_PENDING;
        }
        return PublicProfileRelationship.NONE;
    }

    @Transactional
    public void sendFriendRequest(SecurityUser me, long targetUserId) {
        if (Objects.equals(me.getId(), targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot send a friend request to yourself.");
        }
        User meUser = userRepository.findById(me.getId()).orElseThrow();
        User target = userRepository
                .findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        Pair p = pair(me.getId(), targetUserId);
        Optional<UserFriendship> existing = friendshipRepository.findByUserLow_IdAndUserHigh_Id(p.low, p.high);
        if (existing.isEmpty()) {
            User low = userRepository.getReferenceById(p.low);
            User high = userRepository.getReferenceById(p.high);
            UserFriendship row = UserFriendship.builder()
                    .userLow(low)
                    .userHigh(high)
                    .status(FriendshipStatus.PENDING)
                    .initiator(meUser)
                    .build();
            friendshipRepository.save(row);
            String deep = "/users/" + me.getId();
            appNotificationService.publishWithInboxNudge(
                    target.getId(),
                    AppNotificationKind.FRIEND_REQUEST_RECEIVED,
                    "New friend request",
                    meUser.getDisplayName() + " sent you a friend request.",
                    deep,
                    "friend",
                    meUser.getAvatarUrl());
            appNotificationService.publishWithInboxNudge(
                    me.getId(),
                    AppNotificationKind.FRIEND_REQUEST_SENT,
                    "Friend request sent",
                    "Your request was sent to " + target.getDisplayName() + ".",
                    "/users/" + target.getId(),
                    "friend",
                    target.getAvatarUrl());
            return;
        }
        UserFriendship f = existing.get();
        if (f.getStatus() == FriendshipStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You are already friends.");
        }
        // PENDING
        if (f.getInitiator().getId().equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Friend request already pending.");
        }
        // Other user already sent to me — auto-accept when I click add friend
        f.setStatus(FriendshipStatus.ACCEPTED);
        friendshipRepository.save(f);
        unlockDirectDmGateBetween(me.getId(), f.getInitiator().getId());
        User originalRequester = f.getInitiator();
        appNotificationService.publishWithInboxNudge(
                originalRequester.getId(),
                AppNotificationKind.FRIEND_REQUEST_ACCEPTED,
                "Friend request accepted",
                meUser.getDisplayName() + " accepted your friend request.",
                "/users/" + me.getId(),
                "friend",
                meUser.getAvatarUrl());
        appNotificationService.publishWithInboxNudge(
                me.getId(),
                AppNotificationKind.FRIEND_REQUEST_ACCEPTED,
                "You are now friends",
                "You and " + originalRequester.getDisplayName() + " are now friends.",
                "/users/" + originalRequester.getId(),
                "friend",
                originalRequester.getAvatarUrl());
    }

    @Transactional
    public void accept(SecurityUser me, long otherUserId) {
        Pair p = pair(me.getId(), otherUserId);
        UserFriendship f = friendshipRepository
                .findByUserLow_IdAndUserHigh_Id(p.low, p.high)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No pending request."));
        if (f.getStatus() != FriendshipStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No pending request.");
        }
        if (f.getInitiator().getId().equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot accept your own outgoing request.");
        }
        User meUser = userRepository.findById(me.getId()).orElseThrow();
        User initiator = f.getInitiator();
        f.setStatus(FriendshipStatus.ACCEPTED);
        friendshipRepository.save(f);
        unlockDirectDmGateBetween(me.getId(), initiator.getId());
        appNotificationService.publishWithInboxNudge(
                initiator.getId(),
                AppNotificationKind.FRIEND_REQUEST_ACCEPTED,
                "Friend request accepted",
                meUser.getDisplayName() + " accepted your friend request.",
                "/users/" + me.getId(),
                "friend",
                meUser.getAvatarUrl());
    }

    @Transactional
    public void decline(SecurityUser me, long otherUserId) {
        Pair p = pair(me.getId(), otherUserId);
        UserFriendship f = friendshipRepository
                .findByUserLow_IdAndUserHigh_Id(p.low, p.high)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No request."));
        if (f.getStatus() != FriendshipStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No pending request.");
        }
        if (f.getInitiator().getId().equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use cancel to withdraw your request.");
        }
        friendshipRepository.delete(f);
    }

    @Transactional
    public void cancelOutgoing(SecurityUser me, long otherUserId) {
        Pair p = pair(me.getId(), otherUserId);
        UserFriendship f = friendshipRepository
                .findByUserLow_IdAndUserHigh_Id(p.low, p.high)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No request."));
        if (f.getStatus() != FriendshipStatus.PENDING || !f.getInitiator().getId().equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No outgoing pending request.");
        }
        friendshipRepository.delete(f);
    }

    @Transactional(readOnly = true)
    public List<FriendDirectoryUserDto> listFriends(SecurityUser me) {
        List<UserFriendship> rows =
                friendshipRepository.findByUserAndStatusWithUsers(me.getId(), FriendshipStatus.ACCEPTED);
        return rows.stream()
                .map(f -> otherUser(f, me.getId()))
                .map(this::toFriendDirectoryDto)
                .sorted(Comparator.comparing(FriendDirectoryUserDto::displayName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private void unlockDirectDmGateBetween(long userIdA, long userIdB) {
        chatThreadRepository
                .findDirectThread(userIdA, userIdB, ThreadType.DIRECT)
                .ifPresent(t -> {
                    if (t.getDmRequestStatus() != null || t.getDmRequestInitiatorId() != null) {
                        t.setDmRequestStatus(null);
                        t.setDmRequestInitiatorId(null);
                        chatThreadRepository.save(t);
                    }
                });
    }

    private FriendDirectoryUserDto toFriendDirectoryDto(User u) {
        return new FriendDirectoryUserDto(
                u.getId(),
                u.getDisplayName(),
                u.getAvatarUrl(),
                u.getProfileCity(),
                u.getProfileRegion(),
                u.getAccountType() != null ? u.getAccountType().name() : null);
    }

    private static User otherUser(UserFriendship f, long meId) {
        if (f.getUserLow().getId().equals(meId)) {
            return f.getUserHigh();
        }
        return f.getUserLow();
    }

    @Transactional(readOnly = true)
    public List<DiscoverUserDto> discover(SecurityUser me) {
        long meId = me.getId();
        User meUser = userRepository.findById(meId).orElseThrow();
        Map<Long, Set<Long>> friendsGraph = buildFriendsGraph();
        Set<Long> myFriends = friendsGraph.getOrDefault(meId, Set.of());

        Set<Long> exclude = new HashSet<>();
        exclude.add(meId);
        exclude.addAll(myFriends);
        for (UserFriendship f : friendshipRepository.findByUserAndStatusWithUsers(meId, FriendshipStatus.PENDING)) {
            if (f.getInitiator().getId().equals(meId)) {
                long other = otherUser(f, meId).getId();
                exclude.add(other);
            }
        }

        List<DiscoverUserDto> scored = new ArrayList<>();
        for (User u : userRepository.findAll()) {
            if (exclude.contains(u.getId())) {
                continue;
            }
            int score = 0;
            if (norm(meUser.getProfileCity()) != null
                    && norm(meUser.getProfileCity()).equals(norm(u.getProfileCity()))) {
                score += WEIGHT_CITY;
            }
            if (norm(meUser.getProfileRegion()) != null
                    && norm(meUser.getProfileRegion()).equals(norm(u.getProfileRegion()))) {
                score += WEIGHT_REGION;
            }
            if (meUser.getAccountType() != null
                    && meUser.getAccountType().equals(u.getAccountType())) {
                score += WEIGHT_ACCOUNT_TYPE;
            }
            Set<Long> theirFriends = friendsGraph.getOrDefault(u.getId(), Set.of());
            int mutual = 0;
            for (Long mf : myFriends) {
                if (theirFriends.contains(mf)) {
                    mutual++;
                }
            }
            score += mutual * WEIGHT_MUTUAL;
            PublicProfileRelationship rel = relationship(meId, u.getId());
            scored.add(new DiscoverUserDto(
                    u.getId(),
                    u.getDisplayName(),
                    u.getAvatarUrl(),
                    u.getProfileCity(),
                    u.getProfileRegion(),
                    u.getAccountType() != null ? u.getAccountType().name() : null,
                    score,
                    mutual,
                    rel));
        }
        scored.sort(Comparator.comparingInt(DiscoverUserDto::score)
                .reversed()
                .thenComparing(d -> d.displayName(), String.CASE_INSENSITIVE_ORDER));
        return scored.stream().limit(DISCOVER_LIMIT).toList();
    }

    private Map<Long, Set<Long>> buildFriendsGraph() {
        List<UserFriendship> accepted =
                friendshipRepository.findAllByStatusWithUsers(FriendshipStatus.ACCEPTED);
        Map<Long, Set<Long>> graph = new HashMap<>();
        for (UserFriendship f : accepted) {
            long a = f.getUserLow().getId();
            long b = f.getUserHigh().getId();
            graph.computeIfAbsent(a, k -> new HashSet<>()).add(b);
            graph.computeIfAbsent(b, k -> new HashSet<>()).add(a);
        }
        return graph;
    }

    private static String norm(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim().toLowerCase(Locale.ROOT);
        return t.isEmpty() ? null : t;
    }
}
