import dotenv from "dotenv";
import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { getAuth } from "@clerk/express";
import Course from "../models/courseModel";

dotenv.config();

function getRazorpayClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export const createRazorpayOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const razorpay = getRazorpayClient();
  if (!razorpay) {
    res.status(500).json({
      message:
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server environment variables.",
    });
    return;
  }

  const { courseId } = req.body as { courseId?: string };
  if (!courseId) {
    res.status(400).json({ message: "courseId is required" });
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const course = await Course.get(courseId);
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    // Razorpay expects amount in the smallest currency unit (paise for INR).
    const amountRupees = Number((course as any).price) || 0;
    const amountPaise = Math.max(100, Math.round(amountRupees * 100));

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      // Razorpay receipt max length is 40 characters.
      // Keep it short, unique, and non-PII.
      receipt: `c_${courseId.slice(0, 8)}_${Date.now().toString(36)}`.slice(
        0,
        40
      ),
    });

    res.json({
      message: "Order created successfully",
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error: any) {
    // Helpful server-side diagnostics; client still gets sanitized message.
    console.error("Razorpay create-order failed", {
      courseId,
      userId,
      statusCode: error?.statusCode,
      error: error?.error,
      message: error?.message,
    });

    const statusCode = error?.statusCode;
    if (statusCode === 401) {
      res.status(401).json({ message: "Razorpay auth failed", error });
      return;
    }
    res.status(500).json({ message: "Error creating Razorpay order", error });
  }
};

export const verifyRazorpayPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(500).json({
      message:
        "Razorpay is not configured. Set RAZORPAY_KEY_SECRET in server environment variables.",
    });
    return;
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({
      message:
        "Missing fields: razorpay_order_id, razorpay_payment_id, razorpay_signature are required",
    });
    return;
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    res.status(400).json({ message: "Signature mismatch" });
    return;
  }

  res.json({ message: "Payment verified successfully", data: { verified: true } });
};

