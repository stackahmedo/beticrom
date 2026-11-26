import { describe, it, expect } from "vitest";
import { canTransitionOrder, canTransitionReturn } from "../../server/domains/orders/stateMachine";
import { verifyWebhookSignature } from "../../server/integrations/webhooks";
import { hmacSha256Hex } from "../../server/utils/crypto";
import { calculateShipping, calculateJapanTax } from "../../src/app/types";
import type { Product } from "../../src/data/products";

const mockProduct = (storage: "dry" | "cool" | "frozen", price: number): Product => ({
  id: "0001",
  listingId: "1",
  nameEN: "Test Item",
  nameJA: "テスト",
  nameBN: "টেস্ট",
  price,
  category: "Grocery",
  subcategory: "Spices",
  brand: "Beticrom",
  storage,
  halalTier: "certified",
  country: "Japan",
  img: "",
  gallery: [],
  rating: 5,
  reviews: 1,
  supplier: "Beticrom",
  stock: 10,
});

describe("Order & Return State Machines", () => {
  it("allows valid order lifecycle transitions and blocks invalid jumps", () => {
    expect(canTransitionOrder("pending", "confirmed")).toBe(true);
    expect(canTransitionOrder("confirmed", "processing")).toBe(true);
    expect(canTransitionOrder("processing", "packed")).toBe(true);
    expect(canTransitionOrder("packed", "shipped")).toBe(true);
    expect(canTransitionOrder("shipped", "delivered")).toBe(true);
    expect(canTransitionOrder("delivered", "completed")).toBe(true);

    // Invalid jumps
    expect(canTransitionOrder("pending", "delivered")).toBe(false);
    expect(canTransitionOrder("cancelled", "confirmed")).toBe(false);
    expect(canTransitionOrder("completed", "cancelled")).toBe(false);
  });

  it("enforces return workflow transitions", () => {
    expect(canTransitionReturn("return_requested", "under_review")).toBe(true);
    expect(canTransitionReturn("approved", "product_received")).toBe(true);
    expect(canTransitionReturn("product_received", "inspected")).toBe(true);
    expect(canTransitionReturn("inspected", "refund_or_replacement")).toBe(true);
    expect(canTransitionReturn("return_requested", "completed")).toBe(false);
  });
});

describe("Cold-Chain Shipping & Japan Tax Calculation", () => {
  it("grants free dry shipping at ¥6,500 and charges frozen surcharge separately", () => {
    const calc = calculateShipping(
      [
        { product: mockProduct("dry", 6500), quantity: 1 },
        { product: mockProduct("frozen", 1000), quantity: 1 },
      ],
      true
    );
    expect(calc.isDryFreeEligible).toBe(true);
    expect(calc.dryBaseFee).toBe(0);
    expect(calc.frozenSurcharge).toBe(330);
    expect(calc.totalShipping).toBe(330);
  });

  it("computes 8% food tax and 10% service tax accurately", () => {
    const tax = calculateJapanTax(1080, 1100);
    expect(tax.foodTax).toBe(80);
    expect(tax.serviceTax).toBe(100);
    expect(tax.totalTax).toBe(180);
  });
});

describe("Webhook HMAC Signature & Replay Window Verification", () => {
  it("accepts valid signature within timestamp tolerance and rejects tampered/expired ones", () => {
    const secret = "whsec_test_secret_123";
    const body = JSON.stringify({ id: "evt_1", type: "payment.succeeded" });
    const nowSec = Math.floor(Date.now() / 1000);
    const sig = hmacSha256Hex(secret, `${nowSec}.${body}`);

    expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: `t=${nowSec},v1=${sig}`,
        secret,
      }).valid
    ).toBe(true);

    expect(
      verifyWebhookSignature({
        rawBody: body + "tamper",
        signatureHeader: `t=${nowSec},v1=${sig}`,
        secret,
      }).valid
    ).toBe(false);

    const oldSec = nowSec - 600;
    const oldSig = hmacSha256Hex(secret, `${oldSec}.${body}`);
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: `t=${oldSec},v1=${oldSig}`,
        secret,
      }).valid
    ).toBe(false);
  });
});
