/**
 * DIA CRM E-Invoice Integration
 *
 * Handles e-fatura (for companies) and e-arsiv (for individuals)
 * API docs: DIA provides REST API for invoice management
 */

const DIA_API_URL = process.env.DIA_API_URL || "https://api.dia.com.tr";
const DIA_API_KEY = process.env.DIA_API_KEY || "";
const DIA_API_SECRET = process.env.DIA_API_SECRET || "";

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
}

interface CreateInvoiceParams {
  orderId: string;
  orderNumber: string;
  invoiceType: "EFATURA" | "EARSIV";
  customer: {
    name: string;
    taxNumber?: string;
    taxOffice?: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    district: string;
  };
  items: InvoiceItem[];
  totalAmount: number;
  vatAmount: number;
}

interface DiaInvoiceResponse {
  invoiceId: string;
  invoiceNo: string;
  pdfUrl: string;
  status: string;
}

class DiaClient {
  private apiUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiUrl = DIA_API_URL;
    this.apiKey = DIA_API_KEY;
    this.apiSecret = DIA_API_SECRET;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
        "X-API-Secret": this.apiSecret,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DIA API Error [${response.status}]: ${error}`);
    }

    return response.json();
  }

  async createInvoice(params: CreateInvoiceParams): Promise<DiaInvoiceResponse> {
    // In development, simulate invoice creation
    if (process.env.NODE_ENV !== "production" || !this.apiKey) {
      console.log("[DIA] Simulating invoice creation for order:", params.orderNumber);
      return {
        invoiceId: `DIA-${Date.now()}`,
        invoiceNo: `VRT${new Date().getFullYear()}${String(Math.floor(Math.random() * 100000)).padStart(6, "0")}`,
        pdfUrl: `/api/invoices/mock-${params.orderId}.pdf`,
        status: "CREATED",
      };
    }

    return this.request<DiaInvoiceResponse>("/v1/invoices", {
      method: "POST",
      body: JSON.stringify({
        type: params.invoiceType,
        customer: params.customer,
        items: params.items.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.totalPrice,
          vat_rate: item.vatRate,
        })),
        total_amount: params.totalAmount,
        vat_amount: params.vatAmount,
        currency: "TRY",
        reference: params.orderNumber,
      }),
    });
  }

  async getInvoicePdf(invoiceId: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.apiUrl}/v1/invoices/${invoiceId}/pdf`, {
      headers: {
        "X-API-Key": this.apiKey,
        "X-API-Secret": this.apiSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get invoice PDF: ${response.status}`);
    }

    return response.arrayBuffer();
  }

  async getInvoiceStatus(invoiceId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/v1/invoices/${invoiceId}`);
  }
}

export const diaClient = new DiaClient();
export type { CreateInvoiceParams, DiaInvoiceResponse, InvoiceItem };
