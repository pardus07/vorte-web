/**
 * Resend Email Integration
 *
 * Handles transactional email sending
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "Vorte Tekstil <noreply@vorte.com.tr>";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

interface ResendResponse {
  id: string;
}

class ResendClient {
  private apiKey: string;
  private from: string;

  constructor() {
    this.apiKey = RESEND_API_KEY;
    this.from = FROM_EMAIL;
  }

  async sendEmail(params: EmailParams): Promise<ResendResponse> {
    // In development, log the email
    if (process.env.NODE_ENV !== "production" || !this.apiKey) {
      console.log("[Resend] Simulating email:");
      console.log(`  To: ${params.to}`);
      console.log(`  Subject: ${params.subject}`);
      return { id: `mock-${Date.now()}` };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
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

    return response.json();
  }

  // Convenience methods for common email types

  async sendOrderConfirmation(to: string, orderNumber: string, totalAmount: string) {
    return this.sendEmail({
      to,
      subject: `Sipariş Onayı - #${orderNumber}`,
      html: orderConfirmationTemplate(orderNumber, totalAmount),
    });
  }

  async sendPaymentSuccess(to: string, orderNumber: string, amount: string) {
    return this.sendEmail({
      to,
      subject: `Ödeme Alındı - #${orderNumber}`,
      html: paymentSuccessTemplate(orderNumber, amount),
    });
  }

  async sendShippingNotification(to: string, orderNumber: string, trackingNo: string, carrier: string) {
    return this.sendEmail({
      to,
      subject: `Kargonuz Yola Çıktı - #${orderNumber}`,
      html: shippingNotificationTemplate(orderNumber, trackingNo, carrier),
    });
  }

  async sendWelcome(to: string, name: string) {
    return this.sendEmail({
      to,
      subject: `Vorte'ye Hoş Geldiniz!`,
      html: welcomeTemplate(name),
    });
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    return this.sendEmail({
      to,
      subject: `Şifre Sıfırlama - Vorte`,
      html: passwordResetTemplate(resetUrl),
    });
  }

  async sendInvoice(to: string, orderNumber: string, invoiceNo: string) {
    return this.sendEmail({
      to,
      subject: `Faturanız Hazır - #${invoiceNo}`,
      html: invoiceTemplate(orderNumber, invoiceNo),
    });
  }
}

// Email templates as functions returning HTML strings
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

function orderConfirmationTemplate(orderNumber: string, totalAmount: string): string {
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

function paymentSuccessTemplate(orderNumber: string, amount: string): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Ödeme Onayı</h2>
    <p style="color:#666;line-height:1.6;">#${orderNumber} numaralı siparişiniz için <strong>${amount}</strong> tutarında ödemeniz alındı.</p>
    <p style="color:#666;font-size:14px;">Siparişiniz hazırlanmaya başlayacak.</p>
  `);
}

function shippingNotificationTemplate(orderNumber: string, trackingNo: string, carrier: string): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Kargonuz Yola Çıktı!</h2>
    <p style="color:#666;line-height:1.6;">#${orderNumber} numaralı siparişiniz kargoya verildi.</p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#666;">Kargo: <strong>${carrier}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#666;">Takip No: <strong style="color:#7AC143;">${trackingNo}</strong></p>
    </div>
  `);
}

function welcomeTemplate(name: string): string {
  return baseTemplate(`
    <h2 style="color:#333;margin:0 0 16px;">Hoş Geldiniz, ${name}!</h2>
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

export const resendClient = new ResendClient();
export type { EmailParams };
