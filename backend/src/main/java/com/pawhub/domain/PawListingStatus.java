package com.pawhub.domain;

public enum PawListingStatus {
    Available,
    /** @deprecated kept for old rows; multi-unit flow uses Available + stock until sold out */
    Pending,
    Sold,
    /** Hidden from browse after 30 days; seller may still see in “mine” */
    Expired
}
