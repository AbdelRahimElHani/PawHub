export type CatDto = {
  id: number;
  name: string;
  breed: string | null;
  ageMonths: number | null;
  gender: "MALE" | "FEMALE" | null;
  bio: string | null;
  photoUrls: string[];
};

export type CatCardDto = {
  id: number;
  name: string;
  breed: string | null;
  ageMonths: number | null;
  gender: "MALE" | "FEMALE" | null;
  bio: string | null;
  coverPhotoUrl: string | null;
  ownerDisplayName: string;
} | null;

export type SwipeResponse = { matched: boolean; threadId: number | null };

export type MatchSummaryDto = {
  matchId: number;
  threadId: number;
  catAName: string;
  catBName: string;
  otherOwnerName: string;
};

export type ThreadSummaryDto = {
  id: number;
  type: string;
  otherUserId: number;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
  marketListingId: number | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  /** From API; absent on older servers — treat as false. */
  unread?: boolean;
};

export type MessageDto = {
  id: number;
  senderId: number;
  body: string;
  createdAt: string;
  attachmentUrl: string | null;
};

export type MarketListingDto = {
  id: number;
  sellerUserId: number;
  catId: number | null;
  title: string;
  description: string | null;
  priceCents: number;
  city: string | null;
  region: string | null;
  status: string;
  photoUrl: string | null;
  sellerDisplayName: string;
};

export type PawCategory = "Food" | "Furniture" | "Toys" | "Health" | "Apparel" | "Other";
export const PAW_CATEGORIES: PawCategory[] = ["Food", "Furniture", "Toys", "Health", "Apparel", "Other"];

export type PawListingDto = {
  id: number;
  sellerUserId: number;
  sellerDisplayName: string;
  sellerAvatarUrl: string | null;
  sellerVerifiedMeow: boolean;
  sellerCompletedSales: number;
  title: string;
  description: string | null;
  priceCents: number;
  isFree: boolean;
  category: PawCategory | null;
  city: string | null;
  region: string | null;
  /** Present on newer API responses */
  country?: string | null;
  cityText: string | null;
  latitude: number | null;
  longitude: number | null;
  pawStatus: "Available" | "Pending" | "Sold" | "Expired";
  imageUrls: string[];
  photoUrl: string | null;
  averageRating: number;
  reviewCount: number;
  createdAt: string | null;
  stockQuantity: number;
  soldQuantity: number;
  expiresAt: string | null;
};

export type PawReviewDto = {
  id: number;
  orderId: number;
  reviewerUserId: number;
  reviewerDisplayName: string;
  reviewerAvatarUrl: string | null;
  targetUserId: number;
  rating: number;
  comment: string | null;
  createdAt: string | null;
};

export type PlaceOrderResponse = {
  orderId: number;
  threadId: number;
};

export type AdoptionListingDto = {
  id: number;
  shelterId: number;
  title: string;
  petName: string | null;
  description: string | null;
  breed: string | null;
  ageMonths: number | null;
  photoUrl: string | null;
  status: string;
  shelterName: string;
};

export type ShelterDto = {
  id: number;
  ownerUserId: number;
  name: string;
  city: string | null;
  region: string | null;
  phone: string | null;
  emailContact: string | null;
  bio: string | null;
  status: string;
  legalEntityName?: string | null;
  einOrTaxId?: string | null;
  yearFounded?: number | null;
  websiteUrl?: string | null;
  facilityAddress?: string | null;
  mailingSameAsFacility?: boolean | null;
  mailingAddress?: string | null;
  animalFocus?: string | null;
  avgMonthlyIntakes?: number | null;
  avgCatsInCare?: number | null;
  staffingOverview?: string | null;
  volunteerProgramSummary?: string | null;
  stateLicenseStatus?: string | null;
  homeVisitPolicy?: string | null;
  adoptionFeePolicy?: string | null;
  spayNeuterPolicy?: string | null;
  returnPolicy?: string | null;
  medicalCareDescription?: string | null;
  behaviorModificationResources?: string | null;
  transportAssistanceNotes?: string | null;
  disasterContingencyPlan?: string | null;
  characterReferences?: string | null;
  missionStatement?: string | null;
  boardChairOrDirectorContact?: string | null;
  socialWebsiteHandles?: string | null;
  docNonprofitUrl?: string | null;
  docFacilityLicenseUrl?: string | null;
  docInsuranceUrl?: string | null;
  docProtocolsUrl?: string | null;
  profileCompletedAt?: string | null;
  profileLastSavedAt?: string | null;
};

export type VetLicenseApplicationAdminDto = {
  id: number;
  userId: number;
  email: string;
  displayName: string;
  licenseNumber: string;
  university: string;
  yearsExperience: number | null;
  phone: string | null;
  professionalBio: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  supportingDocumentUrls?: string[];
};

export type VetApplicationMetricsDto = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};
