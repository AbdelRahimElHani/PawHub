package com.pawhub.web.dto.hub;

import java.util.List;

public record ForumPostDetailDto(ForumPostDto post, List<ForumCommentDto> comments, Integer myVote) {}
