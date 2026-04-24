package com.pawhub.web;

import com.pawhub.service.FriendshipService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.DiscoverUserDto;
import com.pawhub.web.dto.FriendActionRequest;
import com.pawhub.web.dto.FriendDirectoryUserDto;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/social")
@RequiredArgsConstructor
public class SocialController {

    private final FriendshipService friendshipService;

    @PostMapping("/friends/request")
    public ResponseEntity<Void> request(
            @AuthenticationPrincipal SecurityUser user, @Valid @RequestBody FriendActionRequest req) {
        friendshipService.sendFriendRequest(user, req.otherUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/friends/accept")
    public ResponseEntity<Void> accept(
            @AuthenticationPrincipal SecurityUser user, @Valid @RequestBody FriendActionRequest req) {
        friendshipService.accept(user, req.otherUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/friends/decline")
    public ResponseEntity<Void> decline(
            @AuthenticationPrincipal SecurityUser user, @Valid @RequestBody FriendActionRequest req) {
        friendshipService.decline(user, req.otherUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/friends/pending/{otherUserId}")
    public ResponseEntity<Void> cancelOutgoing(
            @AuthenticationPrincipal SecurityUser user, @PathVariable long otherUserId) {
        friendshipService.cancelOutgoing(user, otherUserId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/directory/friends")
    public List<FriendDirectoryUserDto> friends(@AuthenticationPrincipal SecurityUser user) {
        return friendshipService.listFriends(user);
    }

    @GetMapping("/directory/discover")
    public List<DiscoverUserDto> discover(@AuthenticationPrincipal SecurityUser user) {
        return friendshipService.discover(user);
    }
}
