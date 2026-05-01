package com.pawhub.service;

import java.util.Arrays;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Rules for real adoption copy — independent of Gemini, so low-effort/placeholder text cannot
 * publish (or pass photo+text verification) when AI is off or when the model is too lenient.
 */
public final class AdoptionListingTextValidator {

    private static final int TITLE_MIN_CHARS = 4;
    private static final int TITLE_MIN_LETTERS = 3;
    private static final int STORY_MIN_CHARS = 30;
    private static final int STORY_MIN_LETTERS = 20;
    private static final int STORY_MIN_SUBSTANTIVE_WORDS = 3;

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private AdoptionListingTextValidator() {}

    /**
     * @return a short English reason if the text should be rejected, or empty if acceptable.
     */
    public static Optional<String> rejectReason(
            String title, String petName, String description, String breed) {
        String t = clean(title);
        if (t.isEmpty() || t.length() < TITLE_MIN_CHARS) {
            return Optional.of("Headline is too short — add a real adoption headline (not a single number or test string).");
        }
        if (countLetters(t) < TITLE_MIN_LETTERS) {
            return Optional.of("Headline must include real words (not only numbers or symbols).");
        }
        if (onlyTrivialOneCharTokens(t)) {
            return Optional.of("Headline looks like placeholder text (single characters or digits only) — use a real title.");
        }
        if (looksOnlyDigitsPunctuation(t)) {
            return Optional.of("Headline must describe the adoption in words, not just numbers.");
        }
        var story = clean(description);
        if (story.isEmpty() || story.length() < STORY_MIN_CHARS) {
            return Optional.of("Story & details must be at least 30 characters — describe the cat’s personality, care, and the home you want.");
        }
        if (countLetters(story) < STORY_MIN_LETTERS) {
            return Optional.of("Story must include a real description (words), not just numbers or filler.");
        }
        if (substantiveWordCount(story) < STORY_MIN_SUBSTANTIVE_WORDS) {
            return Optional.of("Story is too short or generic — add at least a few meaningful words about this cat.");
        }
        if (onlyTrivialOneCharTokens(story)) {
            return Optional.of("Story looks like placeholder text — write a real adoption description that matches the photo.");
        }
        if (petName != null) {
            String p = clean(petName);
            if (!p.isEmpty()) {
                if (p.length() < 2) {
                    return Optional.of("Cat’s name, if you enter one, must be at least 2 characters.");
                }
                if (countLetters(p) < 1) {
                    return Optional.of("Cat’s name must use letters, not only numbers or symbols.");
                }
                if (looksOnlyDigitsPunctuation(p)) {
                    return Optional.of("Use a real name (letters), not a placeholder number for the cat’s name.");
                }
            }
        }
        if (breed != null) {
            String b = clean(breed);
            if (!b.isEmpty()) {
                if (b.length() < 2) {
                    return Optional.of("Breed (best guess) must be at least 2 characters, or leave it blank.");
                }
                if (countLetters(b) < 1) {
                    return Optional.of("Breed should use letters, or leave it blank.");
                }
            }
        }
        return Optional.empty();
    }

    private static String clean(String s) {
        if (s == null) {
            return "";
        }
        return s.trim();
    }

    private static int countLetters(String s) {
        return (int) s.codePoints()
                .filter(cp -> Character.isLetter(cp))
                .count();
    }

    /** true if the string is only digits, spaces, dots, dashes (no real word content). */
    private static boolean looksOnlyDigitsPunctuation(String s) {
        String n = s.replace(" ", "");
        if (n.isEmpty()) {
            return true;
        }
        for (int i = 0; i < n.length(); i++) {
            char c = n.charAt(i);
            if (Character.isLetter(c)) {
                return false;
            }
        }
        return true;
    }

    private static int substantiveWordCount(String s) {
        return (int) Arrays.stream(WHITESPACE.split(s))
                .map(String::trim)
                .filter(w -> w.length() >= 2)
                .filter(AdoptionListingTextValidator::hasLetter)
                .count();
    }

    private static boolean hasLetter(String w) {
        return w.codePoints().anyMatch(Character::isLetter);
    }

    private static boolean onlyTrivialOneCharTokens(String s) {
        if (s.isEmpty()) {
            return true;
        }
        var parts = WHITESPACE.split(s);
        if (parts.length < 2) {
            return false;
        }
        for (String p : parts) {
            if (p.isEmpty() || p.length() > 1) {
                return false;
            }
        }
        return true;
    }
}
