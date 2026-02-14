import { NextRequest, NextResponse } from "next/server";
import { getModelConfig } from "@/lib/ai-models";
import { getProvider } from "@/lib/ai-providers/registry";

export const runtime = "nodejs";

// #region debug-point: fal-ref
async function __dbgReport(event: Record<string, any>) {
  const url = process.env.TRAE_DEBUG_SERVER_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: process.env.TRAE_DEBUG_SESSION_ID || "fal-ref-20260214",
        ts: Date.now(),
        scope: "api/generate",
        ...event,
      }),
    });
  } catch {
    // ignore
  }
}

function __dbgKind(s?: unknown) {
  if (typeof s !== "string" || s.length === 0) return undefined;
  if (s.startsWith("data:")) return "data";
  if (s.startsWith("blob:")) return "blob";
  if (/^https?:\/\//.test(s)) return "http";
  return "other";
}
// #endregion debug-point: fal-ref

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, modelId = "fal-flux-pro-v1.1", aspect_ratio, mode, image_url, image_urls, mask_url, strength } = body;

    // #region debug-point: fal-ref
    await __dbgReport({
      point: "incoming",
      modelId,
      mode,
      aspect_ratio,
      image_url_kind: __dbgKind(image_url),
      image_url_len: typeof image_url === "string" ? image_url.length : 0,
      image_urls_count: Array.isArray(image_urls) ? image_urls.length : 0,
      image_urls_kinds: Array.isArray(image_urls) ? image_urls.slice(0, 5).map(__dbgKind) : [],
      mask_url_kind: __dbgKind(mask_url),
      strength,
    });
    // #endregion debug-point: fal-ref

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

    // #region debug-point: fal-ref
    await __dbgReport({
      point: "before_provider",
      provider: modelConfig.provider,
      resolvedModelId: modelConfig.id,
      mode,
      image_url_kind: __dbgKind(image_url),
      image_urls_count: Array.isArray(image_urls) ? image_urls.length : 0,
    });
    // #endregion debug-point: fal-ref

    // 3. Delegate to Provider
    const result = await provider.generate({
      prompt,
      modelConfig,
      aspect_ratio,
      mode,
      image_url,
      image_urls,
      mask_url,
      strength,
    });

    // #region debug-point: fal-ref
    await __dbgReport({
      point: "after_provider",
      provider: modelConfig.provider,
      resolvedModelId: modelConfig.id,
      status: result?.status,
      request_id: result?.request_id,
      has_endpoint: !!result?.endpoint,
      images_count: Array.isArray(result?.images) ? result.images.length : 0,
      upstream_keys: result?.upstream ? Object.keys(result.upstream).slice(0, 20) : [],
    });
    // #endregion debug-point: fal-ref


    return NextResponse.json(result);

  } catch (error: any) {
    // #region debug-point: fal-ref
    await __dbgReport({
      point: "error",
      message: error?.message,
      name: error?.name,
    });
    // #endregion debug-point: fal-ref
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
