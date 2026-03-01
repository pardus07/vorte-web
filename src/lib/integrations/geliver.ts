/**
 * Geliver Shipping Integration
 *
 * Handles shipment creation, label generation, and tracking
 */

const GELIVER_API_URL = process.env.GELIVER_API_URL || "https://api.geliver.com";
const GELIVER_API_KEY = process.env.GELIVER_API_KEY || "";

interface ShipmentAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  zipCode?: string;
}

interface ShipmentItem {
  name: string;
  quantity: number;
  weight?: number;
}

interface CreateShipmentParams {
  orderId: string;
  orderNumber: string;
  sender: ShipmentAddress;
  receiver: ShipmentAddress;
  items: ShipmentItem[];
  totalWeight?: number;
  codAmount?: number;
  notes?: string;
}

interface GeLiverShipmentResponse {
  shipmentId: string;
  trackingNo: string;
  carrier: string;
  labelUrl: string;
  estimatedDelivery: string;
}

interface TrackingEvent {
  status: string;
  description: string;
  location: string;
  timestamp: string;
}

class GeLiverClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = GELIVER_API_URL;
    this.apiKey = GELIVER_API_KEY;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Geliver API Error [${response.status}]: ${error}`);
    }

    return response.json();
  }

  async createShipment(params: CreateShipmentParams): Promise<GeLiverShipmentResponse> {
    // In development, simulate shipment creation
    if (process.env.NODE_ENV !== "production" || !this.apiKey) {
      console.log("[Geliver] Simulating shipment for order:", params.orderNumber);
      const carriers = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo"];
      return {
        shipmentId: `GL-${Date.now()}`,
        trackingNo: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        carrier: carriers[Math.floor(Math.random() * carriers.length)],
        labelUrl: `/api/shipping/label/mock-${params.orderId}.pdf`,
        estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString(),
      };
    }

    return this.request<GeLiverShipmentResponse>("/v1/shipments", {
      method: "POST",
      body: JSON.stringify({
        sender: params.sender,
        receiver: params.receiver,
        items: params.items,
        total_weight: params.totalWeight || 0.5,
        cod_amount: params.codAmount || 0,
        reference: params.orderNumber,
        notes: params.notes,
      }),
    });
  }

  async getTracking(trackingNo: string): Promise<TrackingEvent[]> {
    if (process.env.NODE_ENV !== "production" || !this.apiKey) {
      return [
        {
          status: "PICKED_UP",
          description: "Kargo teslim alındı",
          location: "Bursa",
          timestamp: new Date().toISOString(),
        },
      ];
    }

    return this.request<TrackingEvent[]>(`/v1/tracking/${trackingNo}`);
  }

  async cancelShipment(shipmentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/v1/shipments/${shipmentId}/cancel`, {
      method: "POST",
    });
  }
}

export const geliverClient = new GeLiverClient();
export type { CreateShipmentParams, GeLiverShipmentResponse, ShipmentAddress };
