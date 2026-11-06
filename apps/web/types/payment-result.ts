export type ConfirmedPayment = {
  orderId: string;
  orderCode: string;
  transactionRef: string;
  amount: number;
  paidAt: string;
  methodLabel: string;
};

export type PaymentOutcome =
  | { kind: "missing" }
  | { kind: "pending" }
  | { kind: "failed"; message: string; retrySupported: boolean }
  | { kind: "success"; payment: ConfirmedPayment }
  | { kind: "error" };
