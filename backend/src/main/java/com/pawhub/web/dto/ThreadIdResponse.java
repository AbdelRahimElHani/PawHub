package com.pawhub.web.dto;

/**
 * @param messageRequestPending when true, the other person must accept the message request before replying;
 *     the requester may still send until a decline or friendship unlocks full chat.
 */
public record ThreadIdResponse(long threadId, boolean messageRequestPending) {}
