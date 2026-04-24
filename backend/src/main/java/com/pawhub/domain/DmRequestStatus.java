package com.pawhub.domain;

/** Gated 1:1 direct thread until recipient accepts or declines the message request. */
public enum DmRequestStatus {
    PENDING,
    DECLINED
}
