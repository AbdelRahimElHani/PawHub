package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.hub.HubContentService;
import com.pawhub.service.hub.HubForumService;
import com.pawhub.web.dto.hub.*;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hub")
@RequiredArgsConstructor
public class HubController {

    private final HubContentService hubContentService;
    private final HubForumService hubForumService;

    @GetMapping("/faq")
    public List<HubFaqItemDto> faq() {
        return hubContentService.listFaq();
    }

    @GetMapping("/editorial")
    public List<HubEditorialLinkDto> editorial() {
        return hubContentService.listEditorial();
    }

    @GetMapping("/forum/rooms")
    public List<ForumRoomDto> forumRooms() {
        return hubForumService.listRooms();
    }

    @GetMapping("/forum/rooms/{slug}/posts")
    public List<ForumPostDto> forumPosts(@PathVariable String slug) {
        return hubForumService.listPosts(slug);
    }

    @GetMapping("/forum/posts/{id}")
    public ForumPostDetailDto forumPostDetail(@PathVariable Long id, Authentication authentication) {
        Long userId = currentUserId(authentication);
        return hubForumService.getPostDetail(id, userId);
    }

    @PostMapping("/forum/rooms/{slug}/posts")
    public ForumPostDto createForumPost(
            @PathVariable String slug,
            @Valid @RequestBody ForumNewPostRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return hubForumService.createPost(slug, user.getId(), req);
    }

    @PostMapping("/forum/posts/{postId}/comments")
    public ForumCommentDto addComment(
            @PathVariable Long postId,
            @Valid @RequestBody ForumNewCommentRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return hubForumService.addComment(postId, user.getId(), req);
    }

    @PostMapping("/forum/posts/{postId}/vote")
    public ForumPostDetailDto vote(
            @PathVariable Long postId,
            @Valid @RequestBody ForumVoteRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return hubForumService.vote(postId, user.getId(), req);
    }

    @PostMapping("/forum/posts/{postId}/helpful")
    public ForumPostDetailDto markHelpful(
            @PathVariable Long postId,
            @Valid @RequestBody ForumHelpfulRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return hubForumService.markHelpful(postId, user.getId(), req.commentId());
    }

    private static Long currentUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof SecurityUser su)) {
            return null;
        }
        return su.getId();
    }
}
