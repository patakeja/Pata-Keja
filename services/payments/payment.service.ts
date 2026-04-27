import { PaymentProvider } from "@/types";

export class PaymentService {
  getPrimaryProvider() {
    return PaymentProvider.DARAJA;
  }

  getSupportedProviders() {
    return [PaymentProvider.DARAJA];
  }

  isEnabled() {
    return false;
  }
}
