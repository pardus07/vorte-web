import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { resendClient } from "@/lib/integrations/resend";
import { z } from "zod";

const CATEGORY_LABELS: Record<string, string> = {
  FABRIC: "Kumaş",
  THREAD: "İplik",
  ELASTIC: "Lastik",
  ELASTIC_MALE: "Erkek Lastiği",
  ELASTIC_FEMALE: "Kadın Lastiği",
  PACKAGING_MAT: "Ambalaj",
  LABEL: "Etiket",
};

const createQuoteSchema = z.object({
  category: z.string().min(1),
  productDetails: z.string().min(1),
  quantity: z.string().min(1),
});

const updateQuoteSchema = z.object({
  quoteId: z.string().min(1),
  unitPrice: z.number().optional(),
  totalPrice: z.number().optional(),
  currency: z.string().optional(),
  minOrderQty: z.string().optional(),
  leadTimeDays: z.number().int().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "SENT", "RECEIVED", "ACCEPTED", "REJECTED"]).optional(),
});

// GET — list quotes for a specific supplier
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "r");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { supplierId: id };
  if (category) where.category = category;
  if (status) where.status = status;

  const quotes = await db.supplierQuote.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, email: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ quotes });
}

// POST — create a new quote request and send email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const body = await req.json();
  const parsed = createQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify supplier exists
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) {
    return NextResponse.json({ error: "Tedarikçi bulunamadı" }, { status: 404 });
  }

  const { category, productDetails, quantity } = parsed.data;
  const categoryLabel = CATEGORY_LABELS[category] || category;

  // Create quote record
  const quote = await db.supplierQuote.create({
    data: {
      supplierId: id,
      category,
      productDetails,
      quantity,
      status: "SENT",
      emailSentAt: new Date(),
    },
  });

  // Send email using DB template
  let emailHtml = "";
  const emailSubject = `Vorte Tekstil — Teklif Talebi | ${categoryLabel}`;

  // Try to load template from DB
  const template = await db.emailTemplate.findUnique({
    where: { name: "supplier-quote-request" },
  });

  if (template && template.body) {
    // Use DB template with variable replacement
    emailHtml = template.body
      .replace(/\{\{supplierName\}\}/g, supplier.contactName || supplier.name)
      .replace(/\{\{categoryName\}\}/g, categoryLabel)
      .replace(/\{\{productDetails\}\}/g, productDetails.replace(/\n/g, "<br/>"))
      .replace(/\{\{quantity\}\}/g, quantity);
  } else {
    // Fallback: simple HTML
    emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2>Vorte Tekstil — Teklif Talebi</h2>
      <p>Sayın <strong>${supplier.contactName || supplier.name}</strong>,</p>
      <p>Vorte Tekstil olarak aşağıdaki ürün için fiyat teklifi almak istiyoruz:</p>
      <p><strong>Kategori:</strong> ${categoryLabel}</p>
      <p><strong>Ürün:</strong><br/>${productDetails.replace(/\n/g, "<br/>")}</p>
      <p><strong>Miktar:</strong> ${quantity}</p>
      <p>Yanıtınızı <a href="mailto:info@vorte.com.tr">info@vorte.com.tr</a> adresine gönderebilirsiniz.</p>
      <p>Saygılarımızla,<br/>Vorte Tekstil<br/>0850 305 86 35</p>
    </div>`;
  }

  try {
    await resendClient.sendEmail({
      to: supplier.email,
      subject: emailSubject,
      html: emailHtml,
      templateName: "supplier-quote-request",
    });
  } catch (err) {
    console.error("[SupplierQuote] Email gönderimi başarısız:", err);
    // Quote is still created, just mark email as not sent
    await db.supplierQuote.update({
      where: { id: quote.id },
      data: { emailSentAt: null, status: "PENDING" },
    });

    return NextResponse.json(
      {
        quote,
        warning: "Teklif oluşturuldu ancak e-posta gönderilemedi",
      },
      { status: 201 }
    );
  }

  return NextResponse.json({ quote }, { status: 201 });
}

// PATCH — update a quote (price, lead time, notes, status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("products", "w");
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  await params; // consume params (supplierId in URL but quoteId in body)

  const body = await req.json();
  const parsed = updateQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz veri", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { quoteId, ...updateData } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { ...updateData };

  // Convert validUntil string to Date
  if (updateData.validUntil) {
    data.validUntil = new Date(updateData.validUntil);
  }

  // If status changes to RECEIVED, set receivedAt
  if (updateData.status === "RECEIVED") {
    data.receivedAt = new Date();
  }

  const quote = await db.supplierQuote.update({
    where: { id: quoteId },
    data,
    include: {
      supplier: { select: { id: true, name: true, email: true, type: true } },
    },
  });

  return NextResponse.json({ quote });
}
