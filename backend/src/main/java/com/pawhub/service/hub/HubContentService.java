package com.pawhub.service.hub;

import com.pawhub.domain.hub.HubEditorialLink;
import com.pawhub.domain.hub.HubFaqItem;
import com.pawhub.repository.hub.HubEditorialLinkRepository;
import com.pawhub.repository.hub.HubFaqItemRepository;
import com.pawhub.web.dto.hub.*;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HubContentService {

    private final HubFaqItemRepository faqRepository;
    private final HubEditorialLinkRepository editorialRepository;

    public List<HubFaqItemDto> listFaq() {
        return faqRepository.findAll().stream()
                .sorted(Comparator.comparingInt(HubFaqItem::getSortOrder).thenComparing(HubFaqItem::getId))
                .map(this::toFaqDto)
                .toList();
    }

    public List<HubEditorialLinkDto> listEditorial() {
        return editorialRepository.findAll().stream()
                .sorted(Comparator.comparingInt(HubEditorialLink::getSortOrder).thenComparing(HubEditorialLink::getId))
                .map(this::toEditorialDto)
                .toList();
    }

    @Transactional
    public HubFaqItemDto saveFaq(HubFaqUpsertRequest req) {
        String id = req.id() != null && !req.id().isBlank() ? req.id() : "faq-" + System.currentTimeMillis();
        HubFaqItem e = HubFaqItem.builder()
                .id(id)
                .categoryId(req.categoryId())
                .question(req.question())
                .answerText(req.answer())
                .health(req.healthRelated())
                .sortOrder(req.sortOrder())
                .build();
        return toFaqDto(faqRepository.save(e));
    }

    @Transactional
    public void deleteFaq(String id) {
        faqRepository.deleteById(id);
    }

    @Transactional
    public HubEditorialLinkDto saveEditorial(HubEditorialUpsertRequest req) {
        String id = req.id() != null && !req.id().isBlank() ? req.id() : "el-" + System.currentTimeMillis();
        HubEditorialLink e = HubEditorialLink.builder()
                .id(id)
                .title(req.title())
                .url(req.url())
                .topicId(req.topicId())
                .sourceLabel(req.sourceLabel())
                .dek(req.dek())
                .imageUrl(req.imageUrl())
                .featured(req.featured())
                .sortOrder(req.sortOrder())
                .build();
        return toEditorialDto(editorialRepository.save(e));
    }

    @Transactional
    public void deleteEditorial(String id) {
        editorialRepository.deleteById(id);
    }

    private HubFaqItemDto toFaqDto(HubFaqItem e) {
        return new HubFaqItemDto(
                e.getId(), e.getCategoryId(), e.getQuestion(), e.getAnswerText(), e.isHealth(), e.getSortOrder());
    }

    private HubEditorialLinkDto toEditorialDto(HubEditorialLink e) {
        return new HubEditorialLinkDto(
                e.getId(),
                e.getTitle(),
                e.getUrl(),
                e.getTopicId(),
                e.getSourceLabel(),
                e.getDek(),
                e.getImageUrl(),
                e.isFeatured(),
                e.getSortOrder());
    }
}
