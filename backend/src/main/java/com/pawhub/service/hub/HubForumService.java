package com.pawhub.service.hub;

import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.User;
import com.pawhub.service.AppNotificationService;
import com.pawhub.domain.hub.*;
import com.pawhub.repository.UserRepository;
import com.pawhub.repository.hub.*;
import com.pawhub.web.dto.hub.*;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HubForumService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_INSTANT;

    private final HubForumRoomRepository roomRepository;
    private final HubForumPostRepository postRepository;
    private final HubForumCommentRepository commentRepository;
    private final HubForumPostVoteRepository voteRepository;
    private final UserRepository userRepository;
    private final AppNotificationService appNotificationService;

    @Transactional(readOnly = true)
    public List<ForumRoomDto> listRooms() {
        return roomRepository.findAll().stream()
                .sorted(Comparator.comparing(HubForumRoom::getTitle, String.CASE_INSENSITIVE_ORDER))
                .map(this::toRoomDto)
                .toList();
    }

    @Transactional
    public ForumRoomDto createRoom(ForumRoomCreateRequest req, Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NoSuchElementException("User not found"));
        String base = slugify(req.title());
        String slug = uniqueSlug(base);
        HubForumRoom room = HubForumRoom.builder()
                .slug(slug)
                .title(req.title().trim())
                .description(req.description().trim())
                .icon("custom")
                .createdBy(user)
                .build();
        return toRoomDto(roomRepository.save(room));
    }

    @Transactional(readOnly = true)
    public List<ForumPostDto> listPosts(String roomSlug) {
        HubForumRoom room =
                roomRepository.findBySlug(roomSlug).orElseThrow(() -> new NoSuchElementException("Room not found"));
        return postRepository.findByRoomOrderByCreatedAtDesc(room).stream()
                .map(this::toPostDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ForumPostDetailDto getPostDetail(long postId, Long currentUserId) {
        HubForumPost post = postRepository
                .findById(postId)
                .orElseThrow(() -> new NoSuchElementException("Post not found"));
        List<HubForumComment> flat = commentRepository.findByPostOrderByIdAsc(post);
        List<ForumCommentDto> tree = buildCommentTree(flat);
        Integer myVote = null;
        if (currentUserId != null) {
            myVote = voteRepository
                    .findByPostIdAndUserId(postId, currentUserId)
                    .map(HubForumPostVote::getVoteValue)
                    .orElse(null);
        }
        return new ForumPostDetailDto(toPostDto(post), tree, myVote);
    }

    @Transactional
    public ForumPostDto createPost(String roomSlug, Long userId, ForumNewPostRequest req) {
        HubForumRoom room =
                roomRepository.findBySlug(roomSlug).orElseThrow(() -> new NoSuchElementException("Room not found"));
        User author =
                userRepository.findById(userId).orElseThrow(() -> new NoSuchElementException("User not found"));
        HubForumPost post = HubForumPost.builder()
                .room(room)
                .author(author)
                .title(req.title().trim())
                .body(req.body().trim())
                .score(0)
                .commentCount(0)
                .build();
        return toPostDto(postRepository.save(post));
    }

    @Transactional
    public ForumCommentDto addComment(long postId, Long userId, ForumNewCommentRequest req) {
        HubForumPost post =
                postRepository.findById(postId).orElseThrow(() -> new NoSuchElementException("Post not found"));
        User author =
                userRepository.findById(userId).orElseThrow(() -> new NoSuchElementException("User not found"));
        HubForumComment parent = null;
        if (req.parentId() != null) {
            parent = commentRepository
                    .findById(req.parentId())
                    .orElseThrow(() -> new NoSuchElementException("Parent comment not found"));
            if (!parent.getPost().getId().equals(post.getId())) {
                throw new IllegalArgumentException("Parent comment belongs to another post");
            }
        }
        HubForumComment c = HubForumComment.builder()
                .post(post)
                .parent(parent)
                .author(author)
                .body(req.body().trim())
                .build();
        commentRepository.save(c);
        post.setCommentCount(commentRepository.countByPost(post));
        String titleShort = post.getTitle().length() > 80 ? post.getTitle().substring(0, 77) + "…" : post.getTitle();
        String titleSafe = titleShort.replace("\"", "'");
        String threadPath = "/hub/community/" + post.getRoom().getSlug() + "/p/" + post.getId();
        if (parent == null) {
            if (!post.getAuthor().getId().equals(author.getId())) {
                appNotificationService.publish(
                        post.getAuthor().getId(),
                        AppNotificationKind.FORUM_REPLY,
                        "New comment on your thread",
                        String.format("%s commented on \"%s\".", author.getDisplayName(), titleSafe),
                        threadPath,
                        "forum",
                        author.getAvatarUrl());
            }
        } else {
            User parentAuthor = parent.getAuthor();
            if (!parentAuthor.getId().equals(author.getId())) {
                appNotificationService.publish(
                        parentAuthor.getId(),
                        AppNotificationKind.FORUM_COMMENT_REPLY,
                        "Reply to your comment",
                        String.format("%s replied to your comment in \"%s\".", author.getDisplayName(), titleSafe),
                        threadPath,
                        "forum",
                        author.getAvatarUrl());
            }
        }
        return toLeafCommentDto(c);
    }

    @Transactional
    public ForumPostDetailDto vote(long postId, Long userId, ForumVoteRequest req) {
        int newVal = req.value();
        if (newVal != -1 && newVal != 0 && newVal != 1) {
            throw new IllegalArgumentException("Vote must be -1, 0, or 1");
        }
        HubForumPost post =
                postRepository.findById(postId).orElseThrow(() -> new NoSuchElementException("Post not found"));
        int oldVal = voteRepository
                .findByPostIdAndUserId(postId, userId)
                .map(HubForumPostVote::getVoteValue)
                .orElse(0);
        int scoreBefore = post.getScore();
        post.setScore(scoreBefore - oldVal + newVal);
        if (newVal == 0) {
            voteRepository.findByPostIdAndUserId(postId, userId).ifPresent(voteRepository::delete);
        } else {
            HubForumPostVote v = HubForumPostVote.builder()
                    .postId(postId)
                    .userId(userId)
                    .voteValue(newVal)
                    .build();
            voteRepository.save(v);
        }
        postRepository.save(post);
        int scoreAfter = post.getScore();
        if (scoreAfter >= 10
                && scoreBefore < 10
                && !post.getAuthor().getId().equals(userId)) {
            String titleShort = post.getTitle().length() > 70 ? post.getTitle().substring(0, 67) + "…" : post.getTitle();
            appNotificationService.publish(
                    post.getAuthor().getId(),
                    AppNotificationKind.FORUM_SCORE_MILESTONE,
                    "Community milestone",
                    String.format(
                            "Your thread \"%s\" reached %d upvotes.", titleShort.replace("\"", "'"), scoreAfter),
                    "/hub/community/" + post.getRoom().getSlug() + "/p/" + post.getId(),
                    "forum",
                    null);
        }
        return getPostDetail(postId, userId);
    }

    @Transactional
    public ForumPostDetailDto markHelpful(long postId, Long userId, long commentId) {
        HubForumPost post =
                postRepository.findById(postId).orElseThrow(() -> new NoSuchElementException("Post not found"));
        if (!post.getAuthor().getId().equals(userId)) {
            throw new IllegalStateException("Only the post author can mark a helpful answer");
        }
        HubForumComment comment =
                commentRepository.findById(commentId).orElseThrow(() -> new NoSuchElementException("Comment not found"));
        if (!comment.getPost().getId().equals(postId)) {
            throw new IllegalArgumentException("Comment does not belong to this post");
        }
        if (Objects.equals(post.getHelpfulCommentId(), commentId)) {
            post.setHelpfulCommentId(null);
        } else {
            post.setHelpfulCommentId(commentId);
        }
        postRepository.save(post);
        return getPostDetail(postId, userId);
    }

    @Transactional
    public void adminDeleteRoom(long roomId) {
        HubForumRoom room =
                roomRepository.findById(roomId).orElseThrow(() -> new NoSuchElementException("Room not found"));
        roomRepository.delete(room);
    }

    @Transactional
    public void adminDeletePost(long postId) {
        HubForumPost post =
                postRepository.findById(postId).orElseThrow(() -> new NoSuchElementException("Post not found"));
        postRepository.delete(post);
    }

    @Transactional
    public void adminDeleteComment(long commentId) {
        HubForumComment c =
                commentRepository.findById(commentId).orElseThrow(() -> new NoSuchElementException("Comment not found"));
        HubForumPost post = c.getPost();
        commentRepository.delete(c);
        post.setCommentCount(commentRepository.countByPost(post));
    }

    private ForumRoomDto toRoomDto(HubForumRoom r) {
        Long creatorId = r.getCreatedBy() != null ? r.getCreatedBy().getId() : null;
        return new ForumRoomDto(
                r.getId(), r.getSlug(), r.getTitle(), r.getDescription(), r.getIcon(), creatorId);
    }

    private ForumPostDto toPostDto(HubForumPost p) {
        return new ForumPostDto(
                p.getId(),
                p.getRoom().getSlug(),
                p.getAuthor().getId(),
                p.getAuthor().getDisplayName(),
                p.getTitle(),
                p.getBody(),
                ISO.format(p.getCreatedAt()),
                p.getScore(),
                p.getCommentCount(),
                p.getHelpfulCommentId());
    }

    private List<ForumCommentDto> buildCommentTree(List<HubForumComment> flat) {
        if (flat.isEmpty()) {
            return List.of();
        }
        List<HubForumComment> roots = flat.stream()
                .filter(c -> c.getParent() == null)
                .sorted(Comparator.comparing(HubForumComment::getId))
                .toList();
        return roots.stream().map(r -> buildCommentBranch(r, flat)).toList();
    }

    private ForumCommentDto buildCommentBranch(HubForumComment c, List<HubForumComment> all) {
        List<HubForumComment> children = all.stream()
                .filter(x -> x.getParent() != null && x.getParent().getId().equals(c.getId()))
                .sorted(Comparator.comparing(HubForumComment::getId))
                .toList();
        List<ForumCommentDto> childDtos = children.stream().map(ch -> buildCommentBranch(ch, all)).toList();
        Long parentId = c.getParent() == null ? null : c.getParent().getId();
        return new ForumCommentDto(
                c.getId(),
                c.getPost().getId(),
                parentId,
                c.getAuthor().getId(),
                c.getAuthor().getDisplayName(),
                c.getBody(),
                ISO.format(c.getCreatedAt()),
                childDtos);
    }

    private ForumCommentDto toLeafCommentDto(HubForumComment c) {
        Long parentId = c.getParent() == null ? null : c.getParent().getId();
        return new ForumCommentDto(
                c.getId(),
                c.getPost().getId(),
                parentId,
                c.getAuthor().getId(),
                c.getAuthor().getDisplayName(),
                c.getBody(),
                ISO.format(c.getCreatedAt()),
                List.of());
    }

    private String uniqueSlug(String base) {
        String candidate = base;
        int n = 2;
        while (roomRepository.existsBySlug(candidate)) {
            String suffix = "-" + n++;
            int max = 80 - suffix.length();
            String prefix = base.length() > max ? base.substring(0, Math.max(1, max)) : base;
            candidate = prefix + suffix;
        }
        return candidate;
    }

    private static String slugify(String title) {
        String s = Normalizer.normalize(title.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        s = s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+", "").replaceAll("-+$", "");
        if (s.isBlank()) {
            s = "room";
        }
        if (s.length() > 80) {
            s = s.substring(0, 80);
        }
        return s;
    }
}
