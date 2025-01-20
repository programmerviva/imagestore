import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 404 });
    }

    const event = JSON.parse(body);
    await connectToDatabase();

    if (event.event === "payment.capture") {
      const payment = event.payload.payment.entity;

      const order = await Order.findOneAndUpdate(
        { razorpayOrderId: payment.order.id },
        {
          razorpayPaymentId: payment.id,
          status: "Payment Successfully completed",
        }
      ).populate([
        { path: "productId", select: "name" },
        { path: "userId", select: "email" },
      ]);

      if (order) {
        const transporter = nodemailer.createTransport({
          service: "sandbox.smpt.mailtrap.io",
          port: 2525,
          auth: {
            user: "f4d3d3c5f4d3d3c5",
            pass: "f4d3d3c5f4d3d3c5",
            // add these to env file
          },
        });

        await transporter.sendMail({
          from: "your@example.com",
          to: order.userId.email,
          subject: "Order Successful",
          text: `Your order ${order.productId.name} has been successfully placed`,
        });
      }
    }

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
