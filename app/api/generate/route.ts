import { NextRequest, NextResponse } from "next/server";
import { getModelConfig } from "@/lib/ai-models";
import { getProvider } from "@/lib/ai-providers/registry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, modelId = "fal-flux-pro-v1.1", aspect_ratio, mode, image_url, mask_url, strength } = body;

    // 1. Lookup Model Config
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
        return NextResponse.json({ error: "Invalid Model ID" }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 2. Get Provider Adapter
    const provider = getProvider(modelConfig.provider);

    // 3. Delegate to Provider
    const result = await provider.generate({
        prompt,
        modelConfig,
        aspect_ratio,
        mode,
        image_url,
        mask_url,
        strength
    });

    return NextResponse.json(result);

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
  const endpoint = searchParams.get("endpoint"); 
  const modelId = searchParams.get("modelId");

  if (!requestId || !modelId) {
     return NextResponse.json({ error: "Missing id or modelId" }, { status: 400 });
  }

  const modelConfig = getModelConfig(modelId);
  if (!modelConfig) {
      return NextResponse.json({ error: "Invalid Model ID" }, { status: 400 });
  }
  
  const apiKey = process.env[modelConfig.envKey];
  if (!apiKey) {
      return NextResponse.json({ error: `Server config missing for ${modelId}` }, { status: 500 });
  }

  try {
    const provider = getProvider(modelConfig.provider);
    const result = await provider.checkStatus(requestId, endpoint || modelConfig.endpoint || "", apiKey);
    
    return NextResponse.json(result);
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
