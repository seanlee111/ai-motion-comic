import { NextRequest, NextResponse } from "next/server";

export function verifyAuth(req: NextRequest): NextResponse | null {
    const apiKey = req.headers.get("x-api-key");
    const internalKey = process.env.INTERNAL_API_KEY;

    // If environment variable is not set, we might want to fail safe (block) or warn.
    // For this audit, we assume strict security.
    if (!internalKey) {
        console.error("Security Error: INTERNAL_API_KEY is not set in server environment.");
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (apiKey !== internalKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null; // Auth passed
}
