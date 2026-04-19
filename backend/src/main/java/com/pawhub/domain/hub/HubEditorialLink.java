package com.pawhub.domain.hub;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hub_editorial_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HubEditorialLink {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(name = "topic_id", nullable = false, length = 64)
    private String topicId;

    @Column(name = "source_label", length = 256)
    private String sourceLabel;

    @Column(columnDefinition = "TEXT")
    private String dek;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(nullable = false)
    private boolean featured;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
