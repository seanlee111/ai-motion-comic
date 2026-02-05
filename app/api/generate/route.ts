import { NextRequest, NextResponse } from "next/server";

// Supported Models Configuration
const MODELS: Record<string, { endpoint: string; type: "flux" | "sdxl" | "kling" | "minimax" }> = {
  "fal-flux-pro-v1.1": {
    endpoint: "https://queue.fal.run/fal-ai/flux-pro/v1.1",
    type: "flux",
  },
  "fal-flux-dev": {
    endpoint: "https://queue.fal.run/fal-ai/flux/dev",
    type: "flux",
  },
  "fal-flux-schnell": {
    endpoint: "https://queue.fal.run/fal-ai/flux/schnell",
    type: "flux",
  },
  // Add more as needed
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, modelId = "fal-flux-pro-v1.1", aspect_ratio, mode, image_url } = body;

    // 1. Get API Key from Server Env
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: "Server Configuration Error: FAL_KEY is missing" },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 2. Select Model Endpoint
    const selectedModel = MODELS[modelId] || MODELS["fal-flux-pro-v1.1"];
    let endpoint = selectedModel.endpoint;

    // Special case for img2img in Flux
    if (mode === "image-to-image" && selectedModel.type === "flux") {
        // Use Flux Dev for img2img as Pro v1.1 might not support it fully or needs different params
        // For simplicity, we redirect to dev for img2img if user chose flux
        endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
    }

    // 3. Construct Payload
    let image_size = "landscape_16_9";
    if (aspect_ratio === "9:16") image_size = "portrait_16_9";
    if (aspect_ratio === "1:1") image_size = "square_hd";

    const payload: any = {
      prompt,
      image_size,
      safety_tolerance: "2",
    };

    if (mode === "image-to-image" && image_url) {
      payload.image_url = image_url;
      payload.strength = body.strength || 0.75;
    }

    // 4. Call Fal AI
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
    // Return request_id and the used endpoint (for polling)
    return NextResponse.json({ ...data, endpoint });

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
  const endpoint = searchParams.get("endpoint"); // Pass endpoint from client for correct polling
  
  // Get Key from Env
  const falKey = process.env.FAL_KEY;
  
  if (!requestId || !falKey) {
     return NextResponse.json({ error: "Missing id or server configuration" }, { status: 400 });
  }

  // Construct Status URL
  // If endpoint is provided, use it. Otherwise fallback to generic status check.
  let statusUrl = `https://queue.fal.run/requests/${requestId}/status`;
  if (endpoint) {
      statusUrl = `${endpoint}/requests/${requestId}`;
  }

  try {
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
         const err = await response.text();
         return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
