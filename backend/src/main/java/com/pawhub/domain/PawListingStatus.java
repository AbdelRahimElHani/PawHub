package com.pawhub.domain;

public enum PawListingStatus {
    /**
     * Seller is still editing; not visible in public browse. Use {@code POST /api/paw/listings/{id}/publish}
     * after the second AI check (text + image alignment) to go live.
     */
    Draft,
    Available,
    /** @deprecated kept for old rows; multi-unit flow uses Available + stock until sold out */
    Pending,
    Sold,
    /** Hidden from browse after 30 days; seller may still see in “mine” */
    Expired
}
