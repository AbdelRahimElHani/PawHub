package com.pawhub.domain.hub;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hub_faq_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HubFaqItem {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "category_id", nullable = false, length = 32)
    private String categoryId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(name = "answer_text", nullable = false, columnDefinition = "TEXT")
    private String answerText;

    @Column(name = "is_health", nullable = false)
    private boolean health;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
