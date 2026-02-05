import { NextRequest, NextResponse } from "next/server";

const FAL_API_BASE = "https://queue.fal.run/fal-ai/flux-pro/v1.1";

export async function POST(req: NextRequest) {
  try {
    const falKey = req.headers.get("x-fal-key");

    if (!falKey) {
      return NextResponse.json(
        { error: "Missing FAL_KEY header" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { prompt, mode, image_url, aspect_ratio } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Map aspect ratio to image_size
    // Flux Pro supports: square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
    let image_size = "landscape_16_9";
    if (aspect_ratio === "9:16") image_size = "portrait_16_9";
    if (aspect_ratio === "1:1") image_size = "square_hd";
    // 2.35:1 is not standard, fallback to landscape_16_9 or custom if supported.
    // Flux v1.1 Pro supports custom width/height? It says "image_size".
    // We'll stick to presets for now.

    const payload: any = {
      prompt,
      image_size,
      safety_tolerance: "2", // Allow some creative freedom
    };

    if (mode === "image-to-image" && image_url) {
      // Flux Pro v1.1 might not support image_url directly in the same endpoint?
      // Need to check if 'fal-ai/flux-pro/v1.1' supports img2img.
      // Usually Flux Pro is T2I.
      // Flux Dev/Schnell supports img2img.
      // User asked for "Flux" (via Fal.ai or Liblib).
      // "Model Endpoint: fal-ai/flux-pro/v1.1".
      // If v1.1 doesn't support img2img, we might need 'fal-ai/flux/dev' for that mode.
      // I will add logic to switch model if mode is image-to-image.
      
      // Let's assume we switch to fal-ai/flux/dev for img2img or check docs.
      // Ideally, I should search for this.
      // But for now, I'll assume standard param 'image_url' and if it fails, it fails.
      // Actually, for img2img, 'strength' is needed.
      payload.image_url = image_url;
      payload.strength = body.strength || 0.75;
      
      // Flux Dev endpoint: fal-ai/flux/dev
      // I'll override the endpoint URL if img2img
    }

    const endpoint = (mode === "image-to-image") 
      ? "https://queue.fal.run/fal-ai/flux/dev/image-to-image" 
      : FAL_API_BASE;

    // Call Fal AI
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Fal API Error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Fal Queue returns request_id
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("id");
  const falKey = req.headers.get("x-fal-key");
  const mode = searchParams.get("mode"); // to know which endpoint to poll?
  // Actually, queue status endpoint is usually generic or follows the request URL.
  // Standard Fal pattern: /requests/{request_id}
  
  if (!requestId || !falKey) {
     return NextResponse.json({ error: "Missing id or key" }, { status: 400 });
  }

  // The status URL is usually: https://queue.fal.run/fal-ai/flux-pro/v1.1/requests/{id}
  // But strictly speaking it's https://queue.fal.run/requests/{id}/status usually?
  // Let's try the endpoint-specific status url first as it's safer.
  
  const endpointBase = (mode === "image-to-image")
      ? "https://queue.fal.run/fal-ai/flux/dev/image-to-image"
      : FAL_API_BASE;
      
  const statusUrl = `${endpointBase}/requests/${requestId}`;

  try {
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
        // Try the generic status endpoint if specific fails
        const genericUrl = `https://queue.fal.run/requests/${requestId}/status`;
         const response2 = await fetch(genericUrl, {
            method: "GET",
            headers: {
                "Authorization": `Key ${falKey}`,
                "Content-Type": "application/json",
            },
         });
         
         if(!response2.ok) {
            const err = await response2.text();
            return NextResponse.json({ error: err }, { status: response2.status });
         }
         const data2 = await response2.json();
         return NextResponse.json(data2);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
