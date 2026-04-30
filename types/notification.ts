import type { PaymentStatus } from "./payment";

type NotificationJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: NotificationJsonValue | undefined }
  | NotificationJsonValue[];

export enum NotificationType {
  MESSAGE = "message",
  BOOKING = "booking",
  PAYMENT = "payment",
  SYSTEM = "system"
}

export enum PushCampaignReachType {
  AREA = "area",
  TOWN = "town",
  COUNTY = "county"
}

export enum PushCampaignStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed"
}

export type NotificationData = {
  type?: string;
  route?: string;
  bookingId?: string;
  listingId?: string;
  campaignId?: string;
  conversationId?: string;
  [key: string]: NotificationJsonValue | undefined;
};

export type UserNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export type PushSubscriptionKeys = {
  auth: string;
  p256dh: string;
};

export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  createdAt: string;
  updatedAt: string;
  lastSuccessAt: string | null;
  lastError: string | null;
};

export type NotificationPreferenceRecord = {
  userId: string;
  countyId: number | null;
  townId: number | null;
  areaId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertNotificationPreferencesInput = {
  countyId?: number | null;
  townId?: number | null;
  areaId?: number | null;
};

export type PushCampaignQuote = {
  audienceSize: number;
  estimatedImpressions: number;
  cpm: number;
  priceTotal: number;
  reachLabel: string;
};

export type PushCampaignRecord = {
  id: string;
  listingId: string;
  landlordId: string;
  reachType: PushCampaignReachType;
  frequencyPerWeek: number;
  durationDays: number;
  priceTotal: number;
  status: PushCampaignStatus;
  paymentStatus: PaymentStatus;
  startsAt: string | null;
  endsAt: string | null;
  activatedAt: string | null;
  lastDispatchedAt: string | null;
  audienceSize: number;
  impressionsSent: number;
  createdAt: string;
  updatedAt: string;
  listingTitle?: string;
  countyName?: string;
  townName?: string;
  areaName?: string;
};

export type PushCampaignListingOption = {
  id: string;
  title: string;
  countyName: string;
  townName: string;
  areaName: string;
};

export type CreatePushCampaignInput = {
  listingId: string;
  reachType: PushCampaignReachType;
  frequencyPerWeek: number;
  durationDays: number;
};

export type PushCampaignPaymentRecord = {
  id: string;
  campaignId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  phone: string | null;
  mpesaReceipt: string | null;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  providerResultCode: number | null;
  providerResultDesc: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PushCampaignPaymentStartResult = {
  campaign: PushCampaignRecord;
  payment: PushCampaignPaymentRecord;
  customerMessage: string;
};
