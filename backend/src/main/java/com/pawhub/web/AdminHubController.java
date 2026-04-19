package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.hub.HubContentService;
import com.pawhub.service.hub.HubForumService;
import com.pawhub.web.dto.hub.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/hub")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminHubController {

    private final HubContentService hubContentService;
    private final HubForumService hubForumService;

    @PostMapping("/faq")
    public HubFaqItemDto upsertFaq(@Valid @RequestBody HubFaqUpsertRequest req) {
        return hubContentService.saveFaq(req);
    }

    @DeleteMapping("/faq/{id}")
    public void deleteFaq(@PathVariable String id) {
        hubContentService.deleteFaq(id);
    }

    @PostMapping("/editorial")
    public HubEditorialLinkDto upsertEditorial(@Valid @RequestBody HubEditorialUpsertRequest req) {
        return hubContentService.saveEditorial(req);
    }

    @DeleteMapping("/editorial/{id}")
    public void deleteEditorial(@PathVariable String id) {
        hubContentService.deleteEditorial(id);
    }

    @PostMapping("/forum/rooms")
    public ForumRoomDto createForumRoom(
            @Valid @RequestBody ForumRoomCreateRequest req, @AuthenticationPrincipal SecurityUser user) {
        return hubForumService.createRoom(req, user.getId());
    }

    @DeleteMapping("/forum/rooms/{id}")
    public void deleteForumRoom(@PathVariable Long id) {
        hubForumService.adminDeleteRoom(id);
    }

    @DeleteMapping("/forum/posts/{id}")
    public void deleteForumPost(@PathVariable Long id) {
        hubForumService.adminDeletePost(id);
    }

    @DeleteMapping("/forum/comments/{id}")
    public void deleteForumComment(@PathVariable Long id) {
        hubForumService.adminDeleteComment(id);
    }
}
