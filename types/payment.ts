import type { UserRole } from "./auth";
import type { BookingRecord } from "./booking";
import type { PaymentProvider } from "./common";

export enum PaymentMethod {
  PLATFORM = "platform",
  EXTERNAL = "external"
}

export enum PaymentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  FAILED = "failed",
  PARTIALLY_REFUNDED = "partially_refunded"
}

export enum PaymentType {
  DEPOSIT = "deposit",
  RENT = "rent"
}

export type PaymentConfirmationActor = UserRole.ADMIN | UserRole.LANDLORD;

export type PaymentRecord = {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  paymentType: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  commissionAmount: number;
  refundAmount: number;
  phone: string | null;
  mpesaReceipt: string | null;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  providerResultCode: number | null;
  providerResultDesc: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceSettings = {
  refundPercentage: number;
  bookingCapacityMultiplier: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
};

export type MpesaInitiationResult = {
  provider: PaymentProvider;
  success: boolean;
  checkoutRequestId: string;
  customerMessage: string;
  merchantRequestId: string;
  amount: number;
  phone: string;
};

export type DarajaStkPushInput = {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl?: string;
};

export type DarajaStkPushResponse = {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
};

export type PaymentStatusPollResult = {
  payment: PaymentRecord;
  bookingId: string;
  depositPaid: boolean;
};

export type StkPaymentStartResult = PaymentStatusPollResult & {
  customerMessage: string;
};

export type DepositCheckout = {
  listingId: string;
  title: string;
  areaLabel: string;
  priceAmount: number;
  priceLabel: string;
  depositAmount: number;
  holdDurationHours: number;
  refundPercentage: number;
};

export type RentCheckout = {
  bookingId: string;
  listingId: string;
  title: string;
  areaLabel: string;
  listingPrice: number;
  depositAmount: number;
  depositPaidAmount: number;
  refundAmount: number;
  remainingRentAmount: number;
  depositPaymentStatus: PaymentStatus | null;
  rentPaymentStatus: PaymentStatus | null;
  expiresAt: string | null;
  bookingStatus: BookingRecord["status"];
};

export type DepositPaymentBundle = {
  booking: BookingRecord;
  payment: PaymentRecord;
};
