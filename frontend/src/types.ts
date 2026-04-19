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
  marketListingId: number | null;
};

export type MessageDto = {
  id: number;
  senderId: number;
  body: string;
  createdAt: string;
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
};
