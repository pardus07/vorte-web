import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { diaClient } from "@/lib/integrations/dia";
import { resendClient } from "@/lib/integrations/resend";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as unknown as { role: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      user: { select: { email: true, name: true, phone: true } },
      dealer: { select: { email: true, companyName: true, taxNumber: true, taxOffice: true, phone: true, address: true, city: true, district: true } },
      invoice: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.invoice) {
    return NextResponse.json({ error: "Invoice already exists" }, { status: 400 });
  }

  const address = order.addressSnapshot as {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
  };

  const isDealer = !!order.dealer;
  const invoiceType = isDealer ? "EFATURA" : "EARSIV";

  try {
    const result = await diaClient.createInvoice({
      orderId: order.id,
      orderNumber: order.orderNumber,
      invoiceType,
      customer: isDealer
        ? {
            name: order.dealer!.companyName,
            taxNumber: order.dealer!.taxNumber,
            taxOffice: order.dealer!.taxOffice,
            email: order.dealer!.email,
            phone: order.dealer!.phone,
            address: order.dealer!.address,
            city: order.dealer!.city,
            district: order.dealer!.district,
          }
        : {
            name: address.fullName,
            email: order.user?.email || "",
            phone: address.phone,
            address: address.address,
            city: address.city,
            district: address.district,
          },
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        vatRate: 20,
      })),
      totalAmount: order.totalAmount,
      vatAmount: order.totalAmount * 0.2 / 1.2,
    });

    // Save invoice record
    const invoice = await db.invoice.create({
      data: {
        orderId: order.id,
        diaInvoiceId: result.invoiceId,
        invoiceNo: result.invoiceNo,
        invoiceType,
        status: "CREATED",
        pdfUrl: result.pdfUrl,
      },
    });

    // Send invoice email
    const email = order.user?.email || order.dealer?.email;
    if (email) {
      await resendClient.sendInvoice(email, order.orderNumber, result.invoiceNo);
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("[Invoice] Error:", error);
    return NextResponse.json({ error: "Invoice creation failed" }, { status: 500 });
  }
}
