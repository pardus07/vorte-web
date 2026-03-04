/**
 * Geliver Shipping Integration — Official SDK
 *
 * Uses @geliver/sdk for shipment creation, offer acceptance,
 * label generation, tracking, and webhook verification.
 */

import {
  GeliverClient,
  type Shipment,
  type WebhookUpdateTrackingRequest,
  verifyWebhookSignature,
} from "@geliver/sdk";

// ─── Client singleton ────────────────────────────────────────
const GELIVER_TOKEN = process.env.GELIVER_TOKEN || "";

function createClient(): GeliverClient | null {
  if (!GELIVER_TOKEN) return null;
  return new GeliverClient({ token: GELIVER_TOKEN });
}

let _client: GeliverClient | null | undefined;
function getClient(): GeliverClient | null {
  if (_client === undefined) _client = createClient();
  return _client;
}

// ─── TR City Code Map ────────────────────────────────────────
const CITY_CODES: Record<string, string> = {
  adana: "01", adıyaman: "02", afyon: "03", afyonkarahisar: "03", ağrı: "04",
  amasya: "05", ankara: "06", antalya: "07", artvin: "08", aydın: "09",
  balıkesir: "10", bilecik: "11", bingöl: "12", bitlis: "13", bolu: "14",
  burdur: "15", bursa: "16", çanakkale: "17", çankırı: "18", çorum: "19",
  denizli: "20", diyarbakır: "21", edirne: "22", elazığ: "23", erzincan: "24",
  erzurum: "25", eskişehir: "26", gaziantep: "27", giresun: "28", gümüşhane: "29",
  hakkari: "30", hatay: "31", ısparta: "32", mersin: "33", iç: "33", içel: "33",
  istanbul: "34", izmir: "35", kars: "36", kastamonu: "37", kayseri: "38",
  kırklareli: "39", kırşehir: "40", kocaeli: "41", konya: "42", kütahya: "43",
  malatya: "44", manisa: "45", kahramanmaraş: "46", mardin: "47", muğla: "48",
  muş: "49", nevşehir: "50", niğde: "51", ordu: "52", rize: "53",
  sakarya: "54", samsun: "55", siirt: "56", sinop: "57", sivas: "58",
  tekirdağ: "59", tokat: "60", trabzon: "61", tunceli: "62", şanlıurfa: "63",
  uşak: "64", van: "65", yozgat: "66", zonguldak: "67", aksaray: "68",
  bayburt: "69", karaman: "70", kırıkkale: "71", batman: "72", şırnak: "73",
  bartın: "74", ardahan: "75", iğdır: "76", yalova: "77", karabük: "78",
  kilis: "79", osmaniye: "80", düzce: "81",
};

function getCityCode(cityName: string): string {
  const normalized = cityName.toLowerCase().trim();
  return CITY_CODES[normalized] || "16"; // default Bursa
}

// ─── Sender address cache ────────────────────────────────────
let _senderAddressId: string | null = null;

async function getSenderAddressId(client: GeliverClient): Promise<string> {
  if (_senderAddressId) return _senderAddressId;

  // Check existing sender addresses
  try {
    const existing = await client.addresses.list({
      isRecipientAddress: false,
      limit: 10,
    });
    const found = existing.data?.find(
      (a) => a.isDefaultSenderAddress || a.name === "Vorte Tekstil"
    );
    if (found?.id) {
      _senderAddressId = found.id;
      return found.id;
    }
  } catch {
    // continue to create
  }

  // Create sender address
  const sender = await client.addresses.createSender({
    name: "Vorte Tekstil",
    email: "info@vorte.com.tr",
    phone: "+905376220694",
    address1: "Dumlupınar Mah., Kayabaşı Sok., 17BG",
    countryCode: "TR",
    cityName: "Bursa",
    cityCode: "16",
    districtName: "Nilüfer",
  });

  _senderAddressId = sender.id!;
  return sender.id!;
}

// ─── Public interfaces (stable contract for routes) ──────────

export interface ShipmentAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  zipCode?: string;
}

export interface CreateShipmentParams {
  orderId: string;
  orderNumber: string;
  sender: ShipmentAddress;
  receiver: ShipmentAddress;
  items: { name: string; quantity: number; weight?: number }[];
  totalWeight?: number;
  totalAmount?: number;
  codAmount?: number;
  notes?: string;
}

export interface GeLiverShipmentResponse {
  shipmentId: string;
  trackingNo: string;
  carrier: string;
  labelUrl: string;
  estimatedDelivery: string;
}

export interface TrackingEvent {
  status: string;
  description: string;
  location: string;
  timestamp: string;
}

// ─── Main Client Wrapper ─────────────────────────────────────

class GeLiverService {
  /**
   * Create shipment → wait for offers → accept cheapest → return tracking info
   */
  async createShipment(params: CreateShipmentParams): Promise<GeLiverShipmentResponse> {
    const client = getClient();

    // Dev/no-token fallback — simulate
    if (!client) {
      console.log("[Geliver] No token — simulating shipment for:", params.orderNumber);
      const carriers = ["Yurtiçi Kargo", "Aras Kargo", "Sürat Kargo", "MNG Kargo"];
      return {
        shipmentId: `GL-${Date.now()}`,
        trackingNo: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        carrier: carriers[Math.floor(Math.random() * carriers.length)],
        labelUrl: "",
        estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString(),
      };
    }

    const senderAddressID = await getSenderAddressId(client);

    // 1) Create shipment with inline recipient
    const totalWeight = params.totalWeight ||
      params.items.reduce((sum, i) => sum + (i.weight || 0.1) * i.quantity, 0) || 0.5;

    const shipment = await client.shipments.create({
      senderAddressID,
      recipientAddress: {
        name: params.receiver.fullName,
        phone: params.receiver.phone.replace(/\s/g, ""),
        address1: params.receiver.address,
        countryCode: "TR",
        cityName: params.receiver.city,
        cityCode: getCityCode(params.receiver.city),
        districtName: params.receiver.district,
        zip: params.receiver.zipCode || "",
      },
      length: "30",
      width: "20",
      height: "10",
      distanceUnit: "cm",
      weight: String(totalWeight),
      massUnit: "kg",
      order: {
        orderNumber: params.orderNumber,
        sourceIdentifier: "https://vorte.com.tr",
        totalAmount: params.totalAmount ? String(params.totalAmount) : undefined,
        totalAmountCurrency: "TRY",
      },
    });

    // 2) Wait for offers
    await client.shipments.waitForOffers(shipment.id!, {
      intervalMs: 1500,
      timeoutMs: 30000,
    });

    // 3) Re-fetch to get updated offers
    const updated = await client.shipments.get(shipment.id!);
    const cheapestOffer = updated.offers?.cheapest;

    if (!cheapestOffer?.id) {
      throw new Error("Geliver: Teklif bulunamadı — kargo firması mevcut değil");
    }

    // 4) Accept cheapest offer (purchase label)
    const transaction = await client.transactions.acceptOffer(cheapestOffer.id);
    const purchased = transaction.shipment || updated;

    // 5) Wait for tracking number
    let finalShipment: Shipment = purchased;
    if (!purchased.trackingNumber) {
      try {
        finalShipment = await client.shipments.waitForTrackingNumber(shipment.id!, {
          intervalMs: 2000,
          timeoutMs: 15000,
        });
      } catch {
        finalShipment = await client.shipments.get(shipment.id!);
      }
    }

    // Resolve carrier name
    const carrier = cheapestOffer.providerCode ||
      cheapestOffer.providerServiceCode ||
      finalShipment.providerCode ||
      "Kargo";

    return {
      shipmentId: shipment.id!,
      trackingNo: finalShipment.trackingNumber || finalShipment.barcode || "",
      carrier: formatCarrierName(carrier),
      labelUrl: finalShipment.labelURL || "",
      estimatedDelivery: cheapestOffer.estimatedArrivalTime ||
        new Date(Date.now() + 3 * 86400000).toISOString(),
    };
  }

  /**
   * Get tracking events for a shipment
   */
  async getTracking(shipmentId: string): Promise<TrackingEvent[]> {
    const client = getClient();

    if (!client) {
      return [{
        status: "UNKNOWN",
        description: "Geliver token ayarlanmamış",
        location: "",
        timestamp: new Date().toISOString(),
      }];
    }

    const shipment = await client.shipments.get(shipmentId);
    const tracking = shipment.trackingStatus;

    if (!tracking) {
      return [{
        status: shipment.statusCode || "PENDING",
        description: "Kargo bilgisi bekleniyor",
        location: "",
        timestamp: shipment.updatedAt || new Date().toISOString(),
      }];
    }

    return [{
      status: tracking.trackingStatusCode || "UNKNOWN",
      description: tracking.statusDetails || "",
      location: tracking.locationName || "",
      timestamp: tracking.statusDate || tracking.updatedAt || new Date().toISOString(),
    }];
  }

  /**
   * Cancel a shipment
   */
  async cancelShipment(shipmentId: string): Promise<{ success: boolean }> {
    const client = getClient();
    if (!client) return { success: false };

    await client.shipments.cancel(shipmentId);
    return { success: true };
  }

  /**
   * Get shipment details by ID
   */
  async getShipment(shipmentId: string): Promise<Shipment | null> {
    const client = getClient();
    if (!client) return null;
    return client.shipments.get(shipmentId);
  }

  /**
   * Download label PDF as bytes
   */
  async downloadLabel(shipmentId: string): Promise<Uint8Array | null> {
    const client = getClient();
    if (!client) return null;
    return client.shipments.downloadLabel(shipmentId);
  }

  /**
   * Create return shipment
   */
  async createReturn(shipmentId: string): Promise<Shipment | null> {
    const client = getClient();
    if (!client) return null;
    return client.shipments.createReturn(shipmentId, {
      willAccept: true,
      count: 1,
    });
  }
}

// ─── Webhook helpers ─────────────────────────────────────────

export function verifyGeliverWebhook(
  body: string | Uint8Array,
  headers: Record<string, string>
): boolean {
  try {
    return verifyWebhookSignature(body, headers);
  } catch {
    return false;
  }
}

export function parseWebhookEvent(body: string): WebhookUpdateTrackingRequest | null {
  try {
    return JSON.parse(body) as WebhookUpdateTrackingRequest;
  } catch {
    return null;
  }
}

// ─── Carrier name formatter ──────────────────────────────────

const CARRIER_NAMES: Record<string, string> = {
  YURTICI: "Yurtiçi Kargo",
  ARAS: "Aras Kargo",
  MNG: "MNG Kargo",
  SURAT: "Sürat Kargo",
  PTT: "PTT Kargo",
  HEPSIJET: "HepsiJet",
  KOLAYGELSIN: "Kolay Gelsin",
  UPS: "UPS",
  SENDEO: "Sendeo",
  HOROZ: "Horoz Lojistik",
  CAINIAO: "Cainiao",
  TRENDYOLEXPRESS: "Trendyol Express",
};

function formatCarrierName(code: string): string {
  const upper = code.toUpperCase().replace(/_.*$/, "");
  return CARRIER_NAMES[upper] || code;
}

// ─── Export singleton ────────────────────────────────────────

export const geliverClient = new GeLiverService();
