// app/api/seats/route.ts
import { NextResponse } from "next/server";
import { getAllSeats, initDB } from "@/lib/db";
import { redis } from "@/lib/redis";
import { isHeld, getRedisSeatStatus } from "@/lib/locks";

let dbInitialized = false;

export async function GET() {
  try {
    // Initialize DB on first request
    if (!dbInitialized) {
      await initDB();
      dbInitialized = true;
    }

    const seats = await getAllSeats();
    const sections = {};

    for (const seat of seats) {
      let status = seat.status;

      // Check Redis Authoritative Status first
      const redisStatus = await getRedisSeatStatus(seat.seat_id);
      
      if (redisStatus) {
        status = redisStatus;
      } else if (status === "AVAILABLE") {
        // Fallback for race conditions or legacy holds
        const held = await isHeld(seat.seat_id);
        if (held) status = "HOLD";
      }

      if (!sections[seat.section_id]) {
        sections[seat.section_id] = [];
      }

      sections[seat.section_id].push({
        seatId: seat.seat_id,
        status,
      });
    }

    return NextResponse.json({
      sections: Object.entries(sections).map(([sectionId, seats]) => ({
        sectionId,
        seats,
      })),
    });
  } catch (err) {
    console.error("Error fetching seats:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message },
      { status: 500 }
    );
  }
}
