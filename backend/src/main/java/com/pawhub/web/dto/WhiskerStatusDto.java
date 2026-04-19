package com.pawhub.web.dto;

/** Live check against Google AI (API key + PawBot / whisker-model). */
public record WhiskerStatusDto(boolean ok, String message) {}
