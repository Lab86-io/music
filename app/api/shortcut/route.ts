import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url;
    const redirect = body.redirect === true;
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    // Call internal convert link API
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/convert/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error || "conversion failed" }, { status: 502 });

    const matched = data.matchedUrl || null;
    if (redirect && matched) {
      return NextResponse.redirect(matched);
    }

    return NextResponse.json({ original: url, converted: matched, raw: data });
  } catch (error: any) {
    console.error("Shortcut error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

