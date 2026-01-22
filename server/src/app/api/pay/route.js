import { NextResponse } from "next/server";
import {
  createBooking,
  getPaymentByKey,
  savePayment,
  initDB,
} from "@/lib/db";
import { getHoldByBookingId, releaseHold } from "@/lib/locks";

let dbInitialized = false;

export async function POST(req) {
  try {
    // Initialize DB on first request
    if (!dbInitialized) {
      await initDB();
      dbInitialized = true;
    }

    const body = await req.json().catch(() => ({}));
    const { bookingId } = body;
    
    if (!bookingId) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const idempotencyKey = req.headers.get("idempotency-key") || bookingId;

    // Check for idempotent retry
    const existingPayment = await getPaymentByKey(idempotencyKey);
    if (existingPayment) {
      const responseBody = {
        bookingId: existingPayment.booking_id,
        status: existingPayment.status,
      };
      return NextResponse.json(
        responseBody,
        { status: existingPayment.status === "CONFIRMED" ? 200 : 400 }
      );
    }

    // Get hold from Redis using bookingId
    const holdData = await getHoldByBookingId(bookingId);
    
    if (!holdData) {
      const failBody = { bookingId, status: "PAYMENT_FAILED" };
      await savePayment({
        bookingId,
        status: "FAILED",
        idempotencyKey,
      });
      return NextResponse.json(failBody, { status: 400 });
    }

    // Handle both single seat and multiple seats
    const isMultiSeat = holdData.seats && Array.isArray(holdData.seats);
    const seatsToBook = isMultiSeat ? holdData.seats : [holdData];
    const userId = holdData.userId;

    // Create bookings in Postgres for all seats
    try {
      for (const seat of seatsToBook) {
        await createBooking({
          bookingId,
          seatId: seat.seatId,
          sectionId: seat.sectionId,
          userId,
        });

        // Release hold in Redis
        await releaseHold(seat.seatId, userId);
      }

      // Save payment record
      await savePayment({
        bookingId,
        status: "CONFIRMED",
        idempotencyKey,
      });

      return NextResponse.json({ 
        bookingId, 
        status: "CONFIRMED",
        seatsBooked: seatsToBook.length,
      });
    } catch (err) {
      console.error("Failed to create booking:", err);
      const failBody = { bookingId, status: "PAYMENT_FAILED" };
      await savePayment({
        bookingId,
        status: "FAILED",
        idempotencyKey,
      });
      return NextResponse.json(failBody, { status: 400 });
    }
  } catch (err) {
    console.error("Error processing payment:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message },
      { status: 500 }
    );
  }
}
