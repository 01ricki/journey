import { NextRequest, NextResponse } from "next/server";
import { saveSnapshot, getHistory } from "@/lib/history";

/**
 * GET /api/snapshots - Get portfolio value history
 */
export async function GET() {
  try {
    const history = await getHistory();
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Failed to get history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/snapshots - Save a new portfolio value snapshot
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portfolioValue } = body;

    if (typeof portfolioValue !== "number" || portfolioValue < 0) {
      return NextResponse.json(
        { error: "Invalid portfolio value" },
        { status: 400 }
      );
    }

    await saveSnapshot(portfolioValue);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save snapshot:", error);
    return NextResponse.json(
      { error: "Failed to save snapshot" },
      { status: 500 }
    );
  }
}