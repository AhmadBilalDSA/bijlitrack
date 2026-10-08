import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: true,
    processedCount: 0,
    status: "IDLE",
    remarks: "Batch pipeline active. Waiting for vision parser integrations.",
  });
}
