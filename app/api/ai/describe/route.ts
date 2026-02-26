import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json(); // Expecting array of base64 or urls

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing DOUBAO_API_KEY" }, { status: 500 });
    }

    // Construct messages for Vision API
    const content: any[] = [
      { type: "text", text: "请详细描述这张图片中的角色，包括外貌、服装、发型、配饰等细节。请用一段连贯的中文描述。" }
    ];

    // Add up to 5 images
    images.slice(0, 5).forEach((img: string) => {
        content.push({
            type: "image_url",
            image_url: {
                url: img // Supports base64 data URI or public URL
            }
        });
    });

    const payload = {
      model: "doubao-seed-2-0-lite-260215", // User specified model endpoint
      messages: [
        {
          role: "user",
          content: content
        }
      ],
      stream: false
    };

    // Call Volcengine Ark API (Standard OpenAI-compatible endpoint for Ark)
    const endpoint = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Doubao API Error:", errText);
      throw new Error(`Doubao API Error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const description = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ description });

  } catch (error: any) {
    console.error("Describe API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate description" },
      { status: 500 }
    );
  }
}
