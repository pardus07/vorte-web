/**
 * Email Integration (SMTP + Resend fallback)
 *
 * - DB şablonları öncelikli, hardcoded fallback
 * - Email türüne göre FROM adresi (siparis@, fatura@, destek@, bayi@, info@)
 * - Otomatik EmailLog kaydı
 * - SMTP öncelikli, Resend API yedek
 */

import * as nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { createHmac } from "crypto";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const DEFAULT_FROM = process.env.FROM_EMAIL || "Vorte Tekstil <info@vorte.com.tr>";

// SMTP settings (own mail server)
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE === "true"; // true for 465, false for 587

// ─── Newsletter Unsubscribe URL Generator ──────────────────
export function generateUnsubscribeUrl(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "secret";
  const token = createHmac("sha256", secret)
    .update(email)
    .digest("hex")
    .slice(0, 32);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr";
  return `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

// ─── FROM & REPLY-TO Mapping ───────────────────────────────
const FROM_MAP: Record<string, string> = {
  "order-confirmation": "Vorte Sipariş <siparis@vorte.com.tr>",
  "payment-success": "Vorte Sipariş <siparis@vorte.com.tr>",
  "shipping-notification": "Vorte Sipariş <siparis@vorte.com.tr>",
  "delivery-notification": "Vorte Sipariş <siparis@vorte.com.tr>",
  "refund-confirmation": "Vorte Destek <destek@vorte.com.tr>",
  invoice: "Vorte Fatura <fatura@vorte.com.tr>",
  "password-reset": "Vorte Destek <destek@vorte.com.tr>",
  welcome: "Vorte Tekstil <info@vorte.com.tr>",
  "dealer-approved": "Vorte Bayi <bayi@vorte.com.tr>",
  newsletter: "Vorte E-Bülten <info@vorte.com.tr>",
  "contact-reply": "Vorte Tekstil <info@vorte.com.tr>",
  "contact-notification": "Vorte İletişim <info@vorte.com.tr>",
  "production-termin": "Vorte Bayi <bayi@vorte.com.tr>",
  "supplier-order": "Vorte Üretim <uretim@vorte.com.tr>",
};

const REPLY_TO_MAP: Record<string, string> = {
  "order-confirmation": "siparis@vorte.com.tr",
  "payment-success": "siparis@vorte.com.tr",
  "shipping-notification": "siparis@vorte.com.tr",
  invoice: "fatura@vorte.com.tr",
  "password-reset": "destek@vorte.com.tr",
  "refund-confirmation": "destek@vorte.com.tr",
  "dealer-approved": "bayi@vorte.com.tr",
  "production-termin": "bayi@vorte.com.tr",
  "supplier-order": "uretim@vorte.com.tr",
};

function getFromAddress(templateName?: string, overrideFrom?: string): string {
  if (overrideFrom) return overrideFrom;
  if (templateName && FROM_MAP[templateName]) return FROM_MAP[templateName];
  return DEFAULT_FROM;
}

function getReplyTo(templateName?: string): string {
  if (templateName && REPLY_TO_MAP[templateName])
    return REPLY_TO_MAP[templateName];
  return "destek@vorte.com.tr";
}

// ─── Variable Replacement ──────────────────────────────────
function replaceVariables(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => vars[key] ?? match
  );
}

// ─── Sample Data for Preview/Test ──────────────────────────
const SAMPLE_VARS: Record<string, string> = {
  customerName: "Test Müşteri",
  orderNumber: "VRT-260306-TEST",
  totalAmount: "₺299,90",
  amount: "₺299,90",
  items: "2x Erkek Boxer (M, Siyah)",
  trackingNo: "TEST123456789",
  carrier: "Yurtiçi Kargo",
  cagoProvider: "Yurtiçi Kargo",
  invoiceNo: "VRT2026000001",
  resetUrl: "https://vorte.com.tr/sifre-sifirla?token=test-token",
  resetLink: "https://vorte.com.tr/sifre-sifirla?token=test-token",
  companyName: "Test Bayi Ltd.",
  dealerCode: "BAY-TEST01",
  loginUrl: "https://vorte.com.tr/bayi-girisi",
  refundAmount: "₺149,90",
  content: "<p>Bülten içeriği buraya gelecek.</p>",
  terminDate: "15 Nisan 2026",
  productionNote: "Üretim planına alındı, termin tarihi tahminidir.",
  supplierName: "Test Tedarikçi",
  materialsTable: "<tr><td>Ana Kumaş</td><td>50</td><td>kg</td></tr>",
  expectedDeliveryDate: "22 Mart 2026",
  productionOrderNumber: "URE-260315-0001",
};

// ─── SMTP Transporter (lazy init) ──────────────────────────
let smtpTransporter: nodemailer.Transporter | null = null;
function getSmtpTransporter() {
  if (!smtpTransporter && SMTP_HOST) {
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false }, // self-signed cert
    });
  }
  return smtpTransporter;
}

// ─── Interfaces ────────────────────────────────────────────
interface EmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  templateName?: string;
}

interface InternalEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

interface ResendResponse {
  id: string;
}

interface TemplateSendParams {
  templateName: string;
  to: string;
  variables: Record<string, string>;
  overrideFrom?: string;
}

// ─── ResendClient Class ────────────────────────────────────
class ResendClient {
  private apiKey: string;

  constructor() {
    this.apiKey = RESEND_API_KEY;
  }

  // ── Core: Internal send (supports dynamic FROM) ──
  private async sendEmailInternal(
    params: InternalEmailParams
  ): Promise<ResendResponse & { provider: string }> {
    const from = params.from || DEFAULT_FROM;

    // Development: mock
    if (
      process.env.NODE_ENV !== "production" &&
      !SMTP_HOST &&
      !this.apiKey
    ) {
      console.log("[Email] Simulating email:");
      console.log(`  From: ${from}`);
      console.log(`  To: ${params.to}`);
      console.log(`  Subject: ${params.subject}`);
      return { id: `mock-${Date.now()}`, provider: "mock" };
    }

    // Priority 1: SMTP
    const transporter = getSmtpTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from,
          to: params.to,
          subject: params.subject,
          html: params.html,
          replyTo: params.replyTo || "destek@vorte.com.tr",
        });
        console.log(`[SMTP] Email sent: ${info.messageId}`);
        return {
          id: info.messageId || `smtp-${Date.now()}`,
          provider: "smtp",
        };
      } catch (err) {
        console.error("[SMTP] Failed, falling back to Resend:", err);
      }
    }

    // Priority 2: Resend API
    if (!this.apiKey) {
      console.warn("[Email] No SMTP or Resend configured, skipping");
      return { id: `skip-${Date.now()}`, provider: "skip" };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo || "destek@vorte.com.tr",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API Error [${response.status}]: ${error}`);
    }

    const data = await response.json();
    return { ...data, provider: "resend" };
  }

  // ── Auto-logging ──
  private async logEmail(data: {
    to: string;
    subject: string;
    templateId?: string | null;
    templateName?: string;
    fromAddress?: string;
    status: string;
    error?: string;
    provider?: string;
  }) {
    try {
      await db.emailLog.create({
        data: {
          to: data.to,
          subject: data.subject,
          templateId: data.templateId || null,
          templateName: data.templateName || null,
          fromAddress: data.fromAddress || null,
          status: data.status,
          error: data.error || null,
          provider: data.provider || null,
        },
      });
    } catch (err) {
      console.error("[Email] Failed to log:", err);
    }
  }

  // ── Public: Send email (generic, with auto-log) ──
  async sendEmail(params: EmailParams): Promise<ResendResponse> {
    const from = getFromAddress(params.templateName);
    const replyTo = params.replyTo || getReplyTo(params.templateName);

    try {
      const result = await this.sendEmailInternal({
        to: params.to,
        subject: params.subject,
        html: params.html,
        from,
        replyTo,
      });

      this.logEmail({
        to: params.to,
        subject: params.subject,
        templateName: params.templateName,
        fromAddress: from,
        status: "sent",
        provider: result.provider,
      }).catch(() => {});

      return result;
    } catch (err) {
      this.logEmail({
        to: params.to,
        subject: params.subject,
        templateName: params.templateName,
        fromAddress: from,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => {});
      throw err;
    }
  }

  // ── DB Template → Send ──
  async sendFromTemplate(params: TemplateSendParams): Promise<ResendResponse> {
    const { templateName, to, variables, overrideFrom } = params;

    let subject: string;
    let html: string;
    let fromAddress: string;
    let templateId: string | null = null;

    try {
      const template = await db.emailTemplate.findUnique({
        where: { name: templateName },
      });

      if (template && template.active) {
        // DB şablonu kullan
        subject = replaceVariables(template.subject, variables);
        html = replaceVariables(template.body, variables);

        // dealer-approved: DB template'inde {{password}} yoksa şifre satırını enjekte et
        if (
          templateName === "dealer-approved" &&
          variables?.password &&
          !template.body.includes("{{password}}")
        ) {
          const passwordHtml = `<p style="margin:8px 0 0;font-size:14px;color:#666;">Şifre: <strong style="color:#1A1A1A;font-size:16px;">${variables.password}</strong></p>
            <p style="color:#e74c3c;font-size:13px;margin:8px 0 16px;">⚠️ Güvenliğiniz için lütfen ilk girişten sonra şifrenizi değiştiriniz.</p>`;
          // Bayi kodu satırından sonra enjekte et
          const dealerCodePattern = /BAY-[A-Z0-9]+<\/strong><\/p>/;
          const match = html.match(dealerCodePattern);
          if (match) {
            html = html.replace(match[0], match[0] + passwordHtml);
          }
        }

        fromAddress = getFromAddress(
          templateName,
          template.fromAddress || overrideFrom
        );
        templateId = template.id;
      } else {
        // Hardcoded fallback
        const fallback = this.getHardcodedTemplate(templateName, variables);
        subject = fallback.subject;
        html = fallback.html;
        fromAddress = getFromAddress(templateName, overrideFrom);
      }
    } catch {
      // DB hatası → hardcoded fallback
      const fallback = this.getHardcodedTemplate(templateName, variables);
      subject = fallback.subject;
      html = fallback.html;
      fromAddress = getFromAddress(templateName, overrideFrom);
    }

    const replyTo = getReplyTo(templateName);

    try {
      const result = await this.sendEmailInternal({
        to,
        subject,
        html,
        from: fromAddress,
        replyTo,
      });

      this.logEmail({
        to,
        subject,
        templateId,
        templateName,
        fromAddress,
        status: "sent",
        provider: result.provider,
      }).catch(() => {});

      return result;
    } catch (err) {
      this.logEmail({
        to,
        subject,
        templateId,
        templateName,
        fromAddress,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => {});
      throw err;
    }
  }

  // ── Hardcoded fallback templates ──
  private getHardcodedTemplate(
    name: string,
    vars: Record<string, string>
  ): { subject: string; html: string } {
    switch (name) {
      case "order-confirmation":
        return {
          subject: `Sipariş Onayı - #${vars.orderNumber || ""}`,
          html: orderConfirmationTemplate(
            vars.orderNumber || "",
            vars.totalAmount || ""
          ),
        };
      case "payment-success":
        return {
          subject: `Ödeme Alındı - #${vars.orderNumber || ""}`,
          html: paymentSuccessTemplate(
            vars.orderNumber || "",
            vars.amount || ""
          ),
        };
      case "shipping-notification":
        return {
          subject: `Kargonuz Yola Çıktı - #${vars.orderNumber || ""}`,
          html: shippingNotificationTemplate(
            vars.orderNumber || "",
            vars.trackingNo || "",
            vars.carrier || ""
          ),
        };
      case "delivery-notification":
        return {
          subject: `Siparişiniz Teslim Edildi - #${vars.orderNumber || ""}`,
          html: deliveryNotificationTemplate(vars.orderNumber || ""),
        };
      case "welcome":
        return {
          subject: "Vorte'ye Hoş Geldiniz!",
          html: welcomeTemplate(vars.customerName || ""),
        };
      case "password-reset":
        return {
          subject: "Şifre Sıfırlama - Vorte",
          html: passwordResetTemplate(vars.resetUrl || vars.resetLink || ""),
        };
      case "invoice":
        return {
          subject: `Faturanız Hazır - #${vars.invoiceNo || ""}`,
          html: invoiceTemplate(
            vars.orderNumber || "",
            vars.invoiceNo || ""
          ),
        };
      case "refund-confirmation":
        return {
          subject: `İade Onayı - #${vars.orderNumber || ""}`,
          html: refundConfirmationTemplate(
            vars.orderNumber || "",
            vars.refundAmount || ""
          ),
        };
      case "dealer-approved":
        return {
          subject: "Bayi Hesabınız Onaylandı - Vorte",
          html: dealerApprovedTemplate(
            vars.companyName || "",
            vars.dealerCode || "",
            vars.loginUrl || "https://vorte.com.tr/bayi-girisi",
            vars.password || ""
          ),
        };
      case "production-termin":
        return {
          subject: `Üretim Termin Bildirimi - #${vars.orderNumber || ""}`,
          html: productionTerminTemplate(
            vars.companyName || "",
            vars.orderNumber || "",
            vars.terminDate || "",
            vars.productionNote || "",
            vars.totalAmount || ""
          ),
        };
      case "supplier-order":
        return {
          subject: `Malzeme Siparişi - ${vars.productionOrderNumber || "Vorte"}`,
          html: supplierOrderTemplate(
            vars.supplierName || "",
            vars.materialsTable || "",
            vars.expectedDeliveryDate || "",
            vars.productionOrderNumber || "",
            vars.notes || ""
          ),
        };
      case "newsletter":
        return {
          subject: "Vorte E-Bülten",
          html: newsletterTemplate(
            vars.content || "",
            vars.unsubscribeUrl || ""
          ),
        };
      default:
        return {
          subject: `Vorte Tekstil — ${name}`,
          html: baseTemplate(
            `<p style="color:#666;">Bu e-posta için şablon bulunamadı.</p>`
          ),
        };
    }
  }

  // ── Preview: Render template with sample data ──
  async previewTemplate(
    templateName: string
  ): Promise<{ subject: string; html: string; from: string }> {
    try {
      const template = await db.emailTemplate.findUnique({
        where: { name: templateName },
      });

      if (template && template.active) {
        return {
          subject: replaceVariables(template.subject, SAMPLE_VARS),
          html: replaceVariables(template.body, SAMPLE_VARS),
          from: getFromAddress(templateName, template.fromAddress || undefined),
        };
      }
    } catch {
      // fallback
    }

    const fallback = this.getHardcodedTemplate(templateName, SAMPLE_VARS);
    return {
      ...fallback,
      from: getFromAddress(templateName),
    };
  }

  // ── Test: Send template with sample data ──
  async sendTestEmail(
    templateName: string,
    to: string
  ): Promise<ResendResponse> {
    return this.sendFromTemplate({
      templateName,
      to,
      variables: SAMPLE_VARS,
    });
  }

  // ─── Convenience Methods (DB template → hardcoded fallback) ───

  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    totalAmount: string
  ) {
    return this.sendFromTemplate({
      templateName: "order-confirmation",
      to,
      variables: { orderNumber, totalAmount },
    });
  }

  async sendPaymentSuccess(to: string, orderNumber: string, amount: string) {
    return this.sendFromTemplate({
      templateName: "payment-success",
      to,
      variables: { orderNumber, amount },
    });
  }

  async sendShippingNotification(
    to: string,
    orderNumber: string,
    trackingNo: string,
    carrier: string
  ) {
    return this.sendFromTemplate({
      templateName: "shipping-notification",
      to,
      variables: { orderNumber, trackingNo, carrier },
    });
  }

  async sendWelcome(to: string, name: string) {
    return this.sendFromTemplate({
      templateName: "welcome",
      to,
      variables: { customerName: name },
    });
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    return this.sendFromTemplate({
      templateName: "password-reset",
      to,
      variables: { resetUrl, resetLink: resetUrl },
    });
  }

  async sendInvoice(to: string, orderNumber: string, invoiceNo: string) {
    return this.sendFromTemplate({
      templateName: "invoice",
      to,
      variables: { orderNumber, invoiceNo },
    });
  }

  async sendDealerApproved(
    to: string,
    companyName: string,
    dealerCode: string,
    password?: string
  ) {
    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.vorte.com.tr"}/bayi-girisi`;
    return this.sendFromTemplate({
      templateName: "dealer-approved",
      to,
      variables: {
        companyName,
        dealerCode,
        password: password || "",
        loginUrl,
      },
    });
  }

  async sendProductionTerminNotification(
    to: string,
    companyName: string,
    orderNumber: string,
    terminDate: string,
    productionNote: string,
    totalAmount: string
  ) {
    return this.sendFromTemplate({
      templateName: "production-termin",
      to,
      variables: { companyName, orderNumber, terminDate, productionNote, totalAmount },
    });
  }

  async sendSupplierOrder(
    to: string,
    supplierName: string,
    materials: Array<{ name: string; quantity: number; unit: string }>,
    expectedDeliveryDate: string,
    productionOrderNumber: string,
    notes?: string
  ) {
    const materialsTable = materials
      .map(
        (m) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${m.name}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${m.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${m.unit}</td></tr>`
      )
      .join("");
    return this.sendFromTemplate({
      templateName: "supplier-order",
      to,
      variables: {
        supplierName,
        materialsTable,
        expectedDeliveryDate,
        productionOrderNumber,
        notes: notes || "",
      },
    });
  }

  async sendNewsletter(to: string, subject: string, content: string) {
    const unsubscribeUrl = generateUnsubscribeUrl(to);
    return this.sendFromTemplate({
      templateName: "newsletter",
      to,
      variables: { content, unsubscribeUrl },
      overrideFrom: "Vorte E-Bülten <info@vorte.com.tr>",
    });
  }
}

// ─── HTML Template Functions (hardcoded fallback) ──────────

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:20px 0;">
    <h1 style="margin:0;font-size:24px;color:#333;font-weight:bold;">VORTE</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#7AC143;letter-spacing:2px;">TEKSTİL</p>
  </div>
  <div style="background:white;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    ${content}
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#999;">
    <p>Vorte Tekstil Ticaret Ltd. Şti. | Nilüfer, Bursa</p>
    <p>Bu e-posta vorte.com.tr tarafından gönderilmiştir.</p>
  </div>
</div>
</body>
</html>`;
}

function orderConfirmationTemplate(
  orderNumber: string,
  totalAmount: string
): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Sipariş Onayı</h2>
    <p style="color:#666;line-height:1.6;">Siparişiniz başarıyla alındı.</p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#666;">Sipariş No: <strong style="color:#333;">#${orderNumber}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#666;">Toplam: <strong style="color:#7AC143;">${totalAmount}</strong></p>
    </div>
    <p style="color:#666;font-size:14px;">Siparişinizi hesabınızdan takip edebilirsiniz.</p>
  `);
}

function paymentSuccessTemplate(
  orderNumber: string,
  amount: string
): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Ödeme Onayı</h2>
    <p style="color:#666;line-height:1.6;">#${orderNumber} numaralı siparişiniz için <strong>${amount}</strong> tutarında ödemeniz alındı.</p>
    <p style="color:#666;font-size:14px;">Siparişiniz hazırlanmaya başlayacak.</p>
  `);
}

function shippingNotificationTemplate(
  orderNumber: string,
  trackingNo: string,
  carrier: string
): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Kargonuz Yola Çıktı!</h2>
    <p style="color:#666;line-height:1.6;">#${orderNumber} numaralı siparişiniz kargoya verildi.</p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#666;">Kargo: <strong>${carrier}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#666;">Takip No: <strong style="color:#7AC143;">${trackingNo}</strong></p>
    </div>
  `);
}

function deliveryNotificationTemplate(orderNumber: string): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Siparişiniz Teslim Edildi</h2>
    <p style="color:#666;line-height:1.6;">#${orderNumber} numaralı siparişiniz teslim edildi.</p>
    <p style="color:#666;font-size:14px;">Alışveriş deneyiminizi değerlendirmeniz bizim için önemli.</p>
  `);
}

function welcomeTemplate(name: string): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Hoş Geldiniz${name ? `, ${name}` : ""}!</h2>
    <p style="color:#666;line-height:1.6;">Vorte ailesine katıldığınız için teşekkür ederiz.</p>
    <p style="color:#666;font-size:14px;">Kaliteli iç giyim ürünlerimizi keşfetmeye başlayın.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://vorte.com.tr" style="display:inline-block;padding:12px 32px;background:#1A1A1A;color:white;text-decoration:none;border-radius:4px;font-size:14px;font-weight:bold;">Alışverişe Başla</a>
    </div>
  `);
}

function passwordResetTemplate(resetUrl: string): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Şifre Sıfırlama</h2>
    <p style="color:#666;line-height:1.6;">Şifrenizi sıfırlamak için aşağıdaki butona tıklayın.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#7AC143;color:white;text-decoration:none;border-radius:4px;font-size:14px;font-weight:bold;">Şifremi Sıfırla</a>
    </div>
    <p style="color:#999;font-size:12px;">Bu link 1 saat geçerlidir. Şifre sıfırlama talebinde bulunmadıysanız bu e-postayı dikkate almayın.</p>
  `);
}

function invoiceTemplate(orderNumber: string, invoiceNo: string): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Faturanız Hazır</h2>
    <p style="color:#666;line-height:1.6;">#${orderNumber} numaralı siparişinize ait fatura oluşturuldu.</p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#666;">Fatura No: <strong>${invoiceNo}</strong></p>
    </div>
    <p style="color:#666;font-size:14px;">Faturanızı hesabınızdan indirebilirsiniz.</p>
  `);
}

function refundConfirmationTemplate(
  orderNumber: string,
  refundAmount: string
): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">İade Onayı</h2>
    <p style="color:#666;line-height:1.6;">#${orderNumber} numaralı siparişiniz için <strong>${refundAmount}</strong> tutarında iade işleminiz onaylandı.</p>
    <p style="color:#666;font-size:14px;">İade tutarı ödeme yönteminize göre birkaç iş günü içinde hesabınıza yansıyacaktır.</p>
  `);
}

function dealerApprovedTemplate(
  companyName: string,
  dealerCode: string,
  loginUrl: string,
  password?: string
): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Bayi Hesabınız Onaylandı!</h2>
    <p style="color:#666;line-height:1.6;">Sayın ${companyName}, bayi başvurunuz onaylanmıştır.</p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#666;">Bayi Kodu: <strong style="color:#7AC143;">${dealerCode}</strong></p>
      ${password && password.length > 0 ? `<p style="margin:8px 0 0;font-size:14px;color:#666;">Şifre: <strong style="color:#1A1A1A;font-size:16px;">${password}</strong></p>` : ""}
    </div>
    ${password && password.length > 0 ? `<p style="color:#e74c3c;font-size:13px;margin:8px 0 16px;">⚠️ Güvenliğiniz için lütfen ilk girişten sonra şifrenizi değiştiriniz.</p>` : ""}
    <p style="color:#666;font-size:14px;">Aşağıdaki bağlantıdan bayi paneline giriş yapabilirsiniz.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background:#1A1A1A;color:white;text-decoration:none;border-radius:4px;font-size:14px;font-weight:bold;">Bayi Girişi</a>
    </div>
  `);
}

function productionTerminTemplate(
  companyName: string,
  orderNumber: string,
  terminDate: string,
  productionNote: string,
  totalAmount: string
): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Üretim Termin Bildirimi</h2>
    <p style="color:#666;line-height:1.6;">Sayın ${companyName},</p>
    <p style="color:#666;line-height:1.6;">#${orderNumber} numaralı siparişiniz için üretim termin tarihi belirlenmiştir.</p>
    <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;">Tahmini Teslim Tarihi: <strong style="color:#78350f;font-size:16px;">${terminDate}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#92400e;">Sipariş Tutarı: <strong>${totalAmount}</strong></p>
      ${productionNote ? `<p style="margin:8px 0 0;font-size:13px;color:#92400e;">Not: ${productionNote}</p>` : ""}
    </div>
    <p style="color:#666;font-size:14px;">Siparişinizi bayi panelinizden takip edebilirsiniz.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://vorte.com.tr/bayi/siparislerim" style="display:inline-block;padding:12px 32px;background:#1A1A1A;color:white;text-decoration:none;border-radius:4px;font-size:14px;font-weight:bold;">Siparişlerimi Gör</a>
    </div>
  `);
}

function supplierOrderTemplate(
  supplierName: string,
  materialsTable: string,
  expectedDeliveryDate: string,
  productionOrderNumber: string,
  notes: string
): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Malzeme Siparişi</h2>
    <p style="color:#666;line-height:1.6;">Sayın ${supplierName},</p>
    <p style="color:#666;line-height:1.6;">Aşağıdaki malzemelerin siparişini vermek istiyoruz. Lütfen teyit ediniz.</p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#999;">Üretim Sipariş No: <strong style="color:#333;">${productionOrderNumber}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:600;">Malzeme</th>
            <th style="padding:8px 12px;text-align:right;color:#666;font-weight:600;">Miktar</th>
            <th style="padding:8px 12px;text-align:left;color:#666;font-weight:600;">Birim</th>
          </tr>
        </thead>
        <tbody>${materialsTable}</tbody>
      </table>
    </div>
    ${expectedDeliveryDate ? `<p style="color:#666;font-size:14px;">Beklenen Teslim Tarihi: <strong style="color:#7AC143;">${expectedDeliveryDate}</strong></p>` : ""}
    ${notes ? `<p style="color:#666;font-size:14px;">Not: ${notes}</p>` : ""}
    <p style="color:#666;font-size:14px;margin-top:16px;">Siparişi teyit etmek veya sorularınız için lütfen bu e-postayı yanıtlayınız.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="color:#999;font-size:12px;">Bu e-posta Vorte Tekstil üretim sistemi tarafından otomatik gönderilmiştir.</p>
  `);
}

function newsletterTemplate(content: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:20px 0;">
    <h1 style="margin:0;font-size:24px;color:#333;font-weight:bold;">VORTE</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#7AC143;letter-spacing:2px;">TEKSTİL</p>
  </div>
  <div style="background:white;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    ${content}
  </div>
  <div style="text-align:center;padding:20px;font-size:12px;color:#999;">
    <p>Vorte Tekstil Ticaret Ltd. Şti. | Nilüfer, Bursa</p>
    <p>Bu e-posta vorte.com.tr tarafından gönderilmiştir.</p>
    <p style="margin-top:12px;">
      <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Abonelikten çık</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

export const resendClient = new ResendClient();
export type { EmailParams, ResendResponse, TemplateSendParams };
