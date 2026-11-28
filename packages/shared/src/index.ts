import { z } from "zod";

const id = z.guid();
const text = z.string().trim().min(1);
const dateTime = z.iso.datetime({ offset: true });
const count = z.int().nonnegative();
const positive = z.int().positive();
const rating = z.number().min(0).max(5);
const url = z.union([z.url({ protocol: /^https?$/ }), z.string().regex(/^\/(?!\/)[^\s]*$/)]);

export const OperatorTypeSchema = z.enum(["coach", "court_owner", "gym", "academy"]);
export const OperatorStatusSchema = z.enum([
  "draft",
  "pending",
  "changes_requested",
  "rejected",
  "approved",
  "live",
  "paused",
]);
export const BookingStatusSchema = z.enum([
  "pending_payment",
  "confirmed",
  "cancelled",
  "completed",
  "refunded",
  "partially_refunded",
]);
export const OfferingKindSchema = z.enum([
  "session",
  "bundle",
  "membership_plan",
  "program",
  "trial",
  "free_visit",
]);
export const EnquiryKindSchema = z.enum(["question", "free_visit", "trial"]);
export const EnquiryStatusSchema = z.enum(["waiting", "replied", "booked", "closed"]);
export const ApplicationStatusSchema = z.enum([
  "draft",
  "pending",
  "changes_requested",
  "rejected",
  "approved",
]);
export const RefundStatusSchema = z.enum(["requested", "approved", "rejected", "paid"]);
export const ModerationStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const MoneySchema = z.object({ amount: count, currency: z.string().regex(/^[A-Z]{3}$/) });

const coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const directory = z.object({
  sport: text.optional(),
  city: text.optional(),
  area: text.optional(),
  minPrice: count.optional(),
  maxPrice: count.optional(),
  minRating: rating.optional(),
  offset: count.optional(),
  limit: positive.max(100).optional(),
});
const validPrices = ({ minPrice, maxPrice }: { minPrice?: number; maxPrice?: number }) =>
  minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice;
const priceError = {
  path: ["maxPrice"],
  message: "Maximum price must be at least the minimum price",
};

export const OperatorFilterSchema = directory
  .extend({
    type: OperatorTypeSchema.optional(),
    sort: z.enum(["rating", "price", "nearest"]).optional(),
    location: coordinates.optional(),
  })
  .refine(validPrices, priceError)
  .refine(({ sort, location }) => sort !== "nearest" || location !== undefined, {
    path: ["location"],
    message: "A location is required to sort by distance",
  });
export const VenueFilterSchema = directory
  .extend({ indoor: z.boolean().optional() })
  .refine(validPrices, priceError);

export const MediaOwnerSchema = z.object({
  type: z.enum(["operator", "branch", "court", "portfolio", "offering"]),
  id,
});
export const MediaSchema = z.object({
  id,
  owner: MediaOwnerSchema,
  url,
  kind: z.enum(["photo", "video"]),
  sort: count,
  moderationStatus: ModerationStatusSchema,
});

const openingInterval = z
  .object({ start: z.iso.time({ precision: -1 }), end: z.iso.time({ precision: -1 }) })
  .refine(({ start, end }) => start < end, {
    path: ["end"],
    message: "Closing time must follow opening time",
  });
const timezone = text.refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Invalid time zone");

export const BranchInputSchema = z.object({
  id: id.optional(),
  operatorId: id,
  name: text,
  address: text,
  timezone,
  location: coordinates.nullable().optional(),
  hours: z.partialRecord(
    z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    z.array(openingInterval),
  ),
});
export const BranchSchema = BranchInputSchema.extend({ id, photos: z.array(MediaSchema) });

export const OfferingInputSchema = z.object({
  id: id.optional(),
  operatorId: id,
  kind: OfferingKindSchema,
  title: text,
  description: z.string(),
  price: MoneySchema,
  durationMin: positive.nullable(),
  sessionsCount: positive.nullable(),
  capacity: positive.nullable(),
  ageGroup: text.nullable(),
  active: z.boolean(),
});
export const OfferingSchema = OfferingInputSchema.extend({ id });
export const ReviewSchema = z.object({
  id,
  authorName: text,
  rating: z.int().min(1).max(5),
  body: z.string(),
});

export const OperatorCardSchema = z.object({
  id,
  type: OperatorTypeSchema,
  slug: text,
  displayName: text,
  city: text,
  area: text,
  sports: z.array(text),
  photoUrl: url.nullable(),
  ratingAvg: rating,
  ratingCount: count,
  startingPrice: MoneySchema.nullable(),
});
export const OperatorProfileSchema = OperatorCardSchema.extend({
  bio: z.string(),
  portfolio: z.array(MediaSchema),
  offerings: z.array(OfferingSchema),
  reviews: z.array(ReviewSchema),
  branches: z.array(BranchSchema),
  coach: z
    .object({
      experienceYears: count,
      certifications: z.array(text),
      listedBranch: BranchSchema.nullable(),
    })
    .nullable(),
});
export const VenueCardSchema = OperatorCardSchema.extend({
  type: z.literal("court_owner"),
  branches: z.array(
    BranchSchema.extend({
      sports: z.array(text),
      indoor: z.boolean(),
      startingPrice: MoneySchema.nullable(),
    }),
  ),
});

const interval = z.object({ startsAt: dateTime, endsAt: dateTime });
const validInterval = ({ startsAt, endsAt }: { startsAt: string; endsAt: string }) =>
  Date.parse(startsAt) < Date.parse(endsAt);
const intervalError = { path: ["endsAt"], message: "End must follow start" };

export const TimeRangeSchema = interval.refine(validInterval, intervalError);
export const CourtSlotSchema = interval
  .extend({ courtId: id, branchId: id, price: MoneySchema })
  .refine(validInterval, intervalError);
export const CoachSlotSchema = interval
  .extend({ operatorId: id })
  .refine(validInterval, intervalError);

const location = z.discriminatedUnion("type", [
  z.object({ type: z.literal("listed_venue") }),
  z.object({ type: z.literal("own_location"), address: text }),
  z.object({ type: z.literal("booked_court"), courtId: id }),
]);
export const BookingDraftSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("court"), courtId: id, slot: TimeRangeSchema }),
  z.object({ kind: z.literal("coach"), offeringId: id, slot: TimeRangeSchema, location }),
  z.object({ kind: z.literal("membership"), offeringId: id }),
  z.object({ kind: z.literal("enrolment"), offeringId: id }),
]);
export const QuoteLineSchema = z.object({ operatorId: id, description: text, price: MoneySchema });
export const QuoteSchema = z
  .object({
    items: z.array(QuoteLineSchema).min(1),
    platformFee: MoneySchema,
    total: MoneySchema,
  })
  .refine(
    ({ items, platformFee, total }) =>
      platformFee.currency === total.currency &&
      items.every(({ price }) => price.currency === total.currency) &&
      items.reduce((sum, { price }) => sum + price.amount, platformFee.amount) === total.amount,
    {
      path: ["total"],
      message: "Quote total must match item prices and the platform fee in one currency",
    },
  );

export const CheckoutSessionSchema = z.object({
  bookingId: id,
  checkoutUrl: url,
  expiresAt: dateTime,
});
export const BookingSummarySchema = z.object({
  id,
  status: BookingStatusSchema,
  total: MoneySchema,
  createdAt: dateTime,
});
export const BookingDetailSchema = BookingSummarySchema.extend({
  items: z.array(
    QuoteLineSchema.extend({
      id,
      status: BookingStatusSchema,
      courtId: id.nullable(),
      offeringId: id.nullable(),
      slot: TimeRangeSchema.nullable(),
      locationType: z.enum(["listed_venue", "own_location", "booked_court"]).nullable(),
    }),
  ),
});
export const RefundRequestSchema = z.object({
  id,
  bookingId: id,
  reason: text,
  status: RefundStatusSchema,
  items: z.array(z.object({ bookingItemId: id, amount: MoneySchema })),
});

export const EnquiryInputSchema = z.object({
  operatorId: id,
  offeringId: id.optional(),
  kind: EnquiryKindSchema,
  body: text,
});
export const MessageSchema = z.object({
  id,
  enquiryId: id,
  senderUserId: id,
  body: text,
  createdAt: dateTime,
});
export const EnquirySummarySchema = z.object({
  id,
  operatorId: id,
  offeringId: id.nullable(),
  kind: EnquiryKindSchema,
  status: EnquiryStatusSchema,
});
export const EnquirySchema = EnquirySummarySchema.extend({ messages: z.array(MessageSchema) });
export const ApplicationInputSchema = z.object({
  type: OperatorTypeSchema,
  displayName: text,
  city: text,
  area: text,
  sports: z.array(text),
  description: text,
});
export const ApplicationSchema = z.object({
  id,
  operatorId: id,
  input: ApplicationInputSchema,
  status: ApplicationStatusSchema,
  staffMessage: z.string().nullable(),
  reviewedAt: dateTime.nullable(),
});
export const ProfileDraftSchema = z.object({
  operatorId: id,
  displayName: text,
  bio: z.string(),
  sports: z.array(text),
  experienceYears: count.optional(),
  certifications: z.array(text).optional(),
  listedBranchId: id.nullable().optional(),
});
export const SlotBlockSchema = interval
  .extend({
    id,
    courtId: id.nullable(),
    coachId: id.nullable(),
    reason: z.enum(["walk_in", "booking_hold", "closed"]),
  })
  .refine(validInterval, intervalError)
  .refine(
    ({ courtId, coachId }) => (courtId === null) !== (coachId === null),
    "A slot block must belong to exactly one court or coach",
  );
export const DashboardDataSchema = z.object({
  type: OperatorTypeSchema,
  operatorId: id,
  today: z.iso.date(),
  todayBookings: z.array(BookingSummarySchema),
  upcomingBookings: z.array(BookingSummarySchema),
  enquiries: z.array(EnquirySummarySchema),
  members: count,
  enrolments: count,
  attendance: count,
});

export type OperatorType = z.infer<typeof OperatorTypeSchema>;
export type OperatorStatus = z.infer<typeof OperatorStatusSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type OfferingKind = z.infer<typeof OfferingKindSchema>;
export type EnquiryKind = z.infer<typeof EnquiryKindSchema>;
export type EnquiryStatus = z.infer<typeof EnquiryStatusSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type RefundStatus = z.infer<typeof RefundStatusSchema>;
export type ModerationStatus = z.infer<typeof ModerationStatusSchema>;
export type Money = z.infer<typeof MoneySchema>;
export type OperatorFilter = z.infer<typeof OperatorFilterSchema>;
export type VenueFilter = z.infer<typeof VenueFilterSchema>;
export type MediaOwner = z.infer<typeof MediaOwnerSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type BranchInput = z.infer<typeof BranchInputSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type OfferingInput = z.infer<typeof OfferingInputSchema>;
export type Offering = z.infer<typeof OfferingSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type OperatorCard = z.infer<typeof OperatorCardSchema>;
export type OperatorProfile = z.infer<typeof OperatorProfileSchema>;
export type VenueCard = z.infer<typeof VenueCardSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type CourtSlot = z.infer<typeof CourtSlotSchema>;
export type CoachSlot = z.infer<typeof CoachSlotSchema>;
export type BookingDraft = z.infer<typeof BookingDraftSchema>;
export type QuoteLine = z.infer<typeof QuoteLineSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;
export type BookingSummary = z.infer<typeof BookingSummarySchema>;
export type BookingDetail = z.infer<typeof BookingDetailSchema>;
export type RefundRequest = z.infer<typeof RefundRequestSchema>;
export type EnquiryInput = z.infer<typeof EnquiryInputSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type EnquirySummary = z.infer<typeof EnquirySummarySchema>;
export type Enquiry = z.infer<typeof EnquirySchema>;
export type ApplicationInput = z.infer<typeof ApplicationInputSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type ProfileDraft = z.infer<typeof ProfileDraftSchema>;
export type SlotBlock = z.infer<typeof SlotBlockSchema>;
export type DashboardData = z.infer<typeof DashboardDataSchema>;
