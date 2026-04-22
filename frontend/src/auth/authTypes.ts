export type AccountType = "ADOPTER" | "CAT_OWNER" | "SHELTER" | "VET";

export type RegisterPayload = {
  email: string;
  password: string;
  displayName: string;
  accountType: AccountType;
  profileCity?: string | null;
  profileRegion?: string | null;
  profileBio?: string | null;
  shelterOrgName?: string | null;
  shelterCity?: string | null;
  shelterRegion?: string | null;
  shelterPhone?: string | null;
  shelterEmailContact?: string | null;
  shelterBio?: string | null;
  /** Required when accountType is VET */
  vetLicenseNumber?: string | null;
  vetUniversity?: string | null;
  vetYearsExperience?: number | null;
  vetPhone?: string | null;
  vetProfessionalBio?: string | null;
};
