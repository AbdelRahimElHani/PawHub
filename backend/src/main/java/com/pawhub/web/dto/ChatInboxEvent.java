package com.pawhub.web.dto;

public record ChatInboxEvent(String type, Long threadId, MessageDto message) {

    public static ChatInboxEvent message(long threadId, MessageDto message) {
        return new ChatInboxEvent("MESSAGE", threadId, message);
    }
}
