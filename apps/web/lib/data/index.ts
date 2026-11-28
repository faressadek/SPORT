import type {
  Application,
  ApplicationInput,
  BookingDetail,
  BookingDraft,
  BookingSummary,
  Branch,
  BranchInput,
  CheckoutSession,
  CoachSlot,
  CourtSlot,
  DashboardData,
  Enquiry,
  EnquiryInput,
  EnquirySummary,
  Media,
  MediaOwner,
  Message,
  Offering,
  OfferingInput,
  OperatorCard,
  OperatorFilter,
  OperatorProfile,
  OperatorType,
  ProfileDraft,
  Quote,
  RefundRequest,
  SlotBlock,
  TimeRange,
  VenueCard,
  VenueFilter,
} from "@sport/shared";

export class NotImplemented extends Error {
  constructor(operation: string) {
    super(`${operation} is not implemented`);
    this.name = "NotImplemented";
  }
}

function pending(operation: string): () => Promise<never> {
  return async () => {
    throw new NotImplemented(operation);
  };
}

export const listOperators: (filter: OperatorFilter) => Promise<OperatorCard[]> =
  pending("listOperators");
export const getOperatorProfile: (slug: string) => Promise<OperatorProfile> =
  pending("getOperatorProfile");
export const listVenues: (filter: VenueFilter) => Promise<VenueCard[]> = pending("listVenues");
export const getBranchAvailability: (branchId: string, date: string) => Promise<CourtSlot[]> =
  pending("getBranchAvailability");
export const getCoachAvailability: (operatorId: string, date: string) => Promise<CoachSlot[]> =
  pending("getCoachAvailability");

export const quoteBooking: (input: BookingDraft) => Promise<Quote> = pending("quoteBooking");
export const createCheckout: (input: BookingDraft) => Promise<CheckoutSession> =
  pending("createCheckout");
export const listMyBookings: () => Promise<BookingSummary[]> = pending("listMyBookings");
export const getBooking: (id: string) => Promise<BookingDetail> = pending("getBooking");
export const cancelBooking: (id: string, reason: string) => Promise<RefundRequest> =
  pending("cancelBooking");
export const rescheduleBooking: (id: string, newSlot: TimeRange) => Promise<BookingDetail> =
  pending("rescheduleBooking");

export const createEnquiry: (input: EnquiryInput) => Promise<Enquiry> = pending("createEnquiry");
export const listMyEnquiries: () => Promise<EnquirySummary[]> = pending("listMyEnquiries");
export const sendMessage: (enquiryId: string, body: string) => Promise<Message> =
  pending("sendMessage");

export const submitApplication: (input: ApplicationInput) => Promise<Application> =
  pending("submitApplication");
export const getMyApplication: () => Promise<Application | null> = pending("getMyApplication");
export const saveProfileDraft: (input: ProfileDraft) => Promise<void> = pending("saveProfileDraft");
export const uploadMedia: (file: File, owner: MediaOwner) => Promise<Media> =
  pending("uploadMedia");
export const upsertOffering: (input: OfferingInput) => Promise<Offering> =
  pending("upsertOffering");
export const upsertBranch: (input: BranchInput) => Promise<Branch> = pending("upsertBranch");
export const goLive: () => Promise<void> = pending("goLive");
export const getDashboard: (type: OperatorType) => Promise<DashboardData> = pending("getDashboard");
export const addWalkIn: (courtId: string, slot: TimeRange) => Promise<SlotBlock> =
  pending("addWalkIn");
export const replyToEnquiry: (enquiryId: string, body: string) => Promise<Message> =
  pending("replyToEnquiry");
