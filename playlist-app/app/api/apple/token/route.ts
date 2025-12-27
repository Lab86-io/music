import { NextResponse } from "next/server";
import { generateAppleMusicToken } from "@/lib/apple-music";

export async function GET() {
  try {
    // Check if Apple Music credentials are configured
    if (!process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: "Apple Music is not configured" },
        { status: 503 }
      );
    }

    const token = await generateAppleMusicToken();
    return NextResponse.json({ success: true, data: { token } });
  } catch (error) {
    console.error("Apple Music token generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate Apple Music token" },
      { status: 500 }
    );
  }
}

