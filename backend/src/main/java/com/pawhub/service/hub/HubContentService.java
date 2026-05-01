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
        String id = req.id() != null && !req.id().isBlank() ? req.id().trim() : "faq-" + System.currentTimeMillis();
        HubFaqItem e = faqRepository.findById(id).orElse(null);
        if (e == null) {
            e = HubFaqItem.builder()
                    .id(id)
                    .categoryId(req.categoryId().trim())
                    .question(req.question().trim())
                    .answerText(req.answer().trim())
                    .health(req.healthRelated())
                    .sortOrder(req.sortOrder())
                    .sectionTitle(trimToNull(req.sectionTitle()))
                    .build();
        } else {
            e.setCategoryId(req.categoryId().trim());
            e.setQuestion(req.question().trim());
            e.setAnswerText(req.answer().trim());
            e.setHealth(req.healthRelated());
            e.setSortOrder(req.sortOrder());
            e.setSectionTitle(trimToNull(req.sectionTitle()));
        }
        return toFaqDto(faqRepository.save(e));
    }

    @Transactional
    public void reorderFaq(HubReorderIdsRequest req) {
        List<String> ids = req.orderedIds();
        for (int i = 0; i < ids.size(); i++) {
            String id = ids.get(i);
            final int sort = i * 10;
            faqRepository.findById(id).ifPresent(e -> {
                e.setSortOrder(sort);
                faqRepository.save(e);
            });
        }
    }

    @Transactional
    public void deleteFaq(String id) {
        faqRepository.deleteById(id);
    }

    @Transactional
    public HubEditorialLinkDto saveEditorial(HubEditorialUpsertRequest req) {
        String id = req.id() != null && !req.id().isBlank() ? req.id().trim() : "el-" + System.currentTimeMillis();
        HubEditorialLink e = editorialRepository.findById(id).orElse(null);
        if (e == null) {
            e = HubEditorialLink.builder()
                    .id(id)
                    .title(req.title().trim())
                    .url(req.url().trim())
                    .topicId(req.topicId().trim())
                    .sourceLabel(trimToNull(req.sourceLabel()))
                    .dek(trimToNull(req.dek()))
                    .imageUrl(trimToNull(req.imageUrl()))
                    .featured(req.featured())
                    .sortOrder(req.sortOrder())
                    .sectionTitle(trimToNull(req.sectionTitle()))
                    .build();
        } else {
            e.setTitle(req.title().trim());
            e.setUrl(req.url().trim());
            e.setTopicId(req.topicId().trim());
            e.setSourceLabel(trimToNull(req.sourceLabel()));
            e.setDek(trimToNull(req.dek()));
            e.setImageUrl(trimToNull(req.imageUrl()));
            e.setFeatured(req.featured());
            e.setSortOrder(req.sortOrder());
            e.setSectionTitle(trimToNull(req.sectionTitle()));
        }
        return toEditorialDto(editorialRepository.save(e));
    }

    @Transactional
    public void reorderEditorial(HubReorderIdsRequest req) {
        List<String> ids = req.orderedIds();
        for (int i = 0; i < ids.size(); i++) {
            String id = ids.get(i);
            final int sort = i * 10;
            editorialRepository.findById(id).ifPresent(e -> {
                e.setSortOrder(sort);
                editorialRepository.save(e);
            });
        }
    }

    @Transactional
    public void deleteEditorial(String id) {
        editorialRepository.deleteById(id);
    }

    private HubFaqItemDto toFaqDto(HubFaqItem e) {
        return new HubFaqItemDto(
                e.getId(),
                e.getCategoryId(),
                e.getQuestion(),
                e.getAnswerText(),
                e.isHealth(),
                e.getSortOrder(),
                e.getSectionTitle());
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
                e.getSortOrder(),
                e.getSectionTitle());
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
