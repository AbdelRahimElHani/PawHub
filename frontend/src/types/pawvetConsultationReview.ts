export type PawVetConsultationReviewDto = {
  id: number;
  externalCaseId: string;
  vetUserId: number;
  ownerUserId: number;
  ownerDisplayName: string;
  stars: number;
  comment: string | null;
  createdAt: string;
};

export type VetAccountReviewsAdminDto = {
  vetUserId: number;
  displayName: string;
  email: string;
  vetVerificationStatus: string;
  /** True when rejection was caused by admin revoke from reviews (not queue decline). */
  verificationRevokedByAdmin?: boolean;
  averageStars: number;
  reviewCount: number;
  reviews: PawVetConsultationReviewDto[];
};
