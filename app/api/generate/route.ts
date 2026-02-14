import { NextRequest, NextResponse } from "next/server";
import { getModelConfig } from "@/lib/ai-models";
import { getProvider } from "@/lib/ai-providers/registry";

export const runtime = "nodejs";

// #region debug-point: jimeng-ref
async function __dbgReport(event: Record<string, any>) {
  const url = process.env.TRAE_DEBUG_SERVER_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: process.env.TRAE_DEBUG_SESSION_ID || "jimeng-ref-20260214",
        ...event,
        ts: Date.now(),
        scope: "api/generate",
      }),
    });
  } catch {
    // ignore
  }
}

function __dbgImgSummary(images: unknown) {
  const arr = Array.isArray(images) ? images : images ? [images] : [];
  return arr
    .filter((v) => typeof v === "string")
    .map((s) => {
      const str = s as string;
      const kind = str.startsWith("data:")
        ? "data"
        : str.startsWith("blob:")
          ? "blob"
          : /^https?:\/\//.test(str)
            ? "http"
            : "other";
      return { kind, len: str.length, head: str.slice(0, 48) };
    });
}
// #endregion debug-point: jimeng-ref

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, modelId = "fal-flux-pro-v1.1", aspect_ratio, mode, image_url, image_urls, mask_url, strength } = body;

    // #region debug-point: jimeng-ref
    await __dbgReport({
      point: "incoming_request",
      modelId,
      mode,
      aspect_ratio,
      has_image_url: typeof image_url === "string" && image_url.length > 0,
      image_url_kind: typeof image_url === "string" ? __dbgImgSummary(image_url)[0]?.kind : undefined,
      image_urls_count: Array.isArray(image_urls) ? image_urls.length : 0,
      image_urls_summary: __dbgImgSummary(image_urls),
      has_mask_url: typeof mask_url === "string" && mask_url.length > 0,
      strength,
    });
    // #endregion debug-point: jimeng-ref

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
    // #region debug-point: jimeng-ref
    await __dbgReport({
      point: "before_provider_generate",
      provider: modelConfig.provider,
      modelId: modelConfig.id,
      mode,
      image_urls_count: Array.isArray(image_urls) ? image_urls.length : 0,
      image_urls_summary: __dbgImgSummary(image_urls),
    });
    // #endregion debug-point: jimeng-ref

    const result = await provider.generate({
        prompt,
        modelConfig,
        aspect_ratio,
        mode,
        image_url,
        image_urls, // New field
        mask_url,
        strength
    });

    // #region debug-point: jimeng-ref
    await __dbgReport({
      point: "after_provider_generate",
      provider: modelConfig.provider,
      modelId: modelConfig.id,
      status: result?.status,
      request_id: result?.request_id,
      images_count: Array.isArray(result?.images) ? result.images.length : 0,
      has_endpoint: !!result?.endpoint,
      has_error: !!result?.error,
    });
    // #endregion debug-point: jimeng-ref

    return NextResponse.json(result);

  } catch (error: any) {
    // #region debug-point: jimeng-ref
    await __dbgReport({
      point: "api_error",
      message: error?.message,
      name: error?.name,
    });
    // #endregion debug-point: jimeng-ref
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
