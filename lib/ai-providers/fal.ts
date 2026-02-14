import { AIProviderAdapter, GenerationRequest, GenerationResponse } from './types';

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
        scope: "provider/fal",
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

export const FalProvider: AIProviderAdapter = {
  async generate(req: GenerationRequest): Promise<GenerationResponse> {
    const { modelConfig, prompt, aspect_ratio, mode, image_url, mask_url, strength } = req;
    
    const apiKey = process.env[modelConfig.envKey];
    if (!apiKey) throw new Error(`Missing API Key: ${modelConfig.envKey}`);

    let image_size = "landscape_16_9";
    if (aspect_ratio === "9:16") image_size = "portrait_16_9";
    if (aspect_ratio === "1:1") image_size = "square_hd";

    const payload: any = {
      prompt,
      image_size,
      enable_safety_checker: false
    };

    let endpoint = modelConfig.endpoint || "https://queue.fal.run/fal-ai/flux-general";

    // Set parameters based on model
    if (modelConfig.id.includes('flux')) {
        payload.num_inference_steps = 28;
        payload.guidance_scale = 3.5;
    } else if (modelConfig.id.includes('sdxl')) {
        payload.num_inference_steps = 30;
        payload.guidance_scale = 7.5;
    }

    if (mode === "image-to-image" && image_url) {
      payload.image_url = image_url;
      payload.strength = strength || 0.85;
      if (modelConfig.id.includes('flux')) {
         endpoint = "https://queue.fal.run/fal-ai/flux-general/image-to-image";
      } else if (modelConfig.id.includes('sdxl')) {
         endpoint = "https://queue.fal.run/fal-ai/fast-sdxl/image-to-image";
      }
    } else {
       // If NOT image-to-image mode (or no image_url), revert to standard dev/schnell endpoints for Flux
       if (modelConfig.id === 'fal-flux-dev') {
           endpoint = "https://queue.fal.run/fal-ai/flux/dev";
       } else if (modelConfig.id === 'fal-flux-schnell') {
           endpoint = "https://queue.fal.run/fal-ai/flux/schnell";
       } else if (modelConfig.id === 'fal-fast-sdxl') {
           endpoint = "https://queue.fal.run/fal-ai/fast-sdxl";
       }
    }

    if (mode === "inpainting" && image_url && mask_url) {
        payload.image_url = image_url;
        payload.mask_url = mask_url;
        endpoint = "https://queue.fal.run/fal-ai/flux-pro/v1.1-inpainting"; // Keep as is for now if unused
    }

    // #region debug-point: fal-ref
    await __dbgReport({
      point: "request_preflight",
      modelId: modelConfig.id,
      mode,
      endpoint,
      image_url_kind: __dbgKind(payload.image_url),
      has_image_url: !!payload.image_url,
      has_strength: typeof payload.strength !== "undefined",
      strength: payload.strength,
      payload_keys: Object.keys(payload).slice(0, 50),
    });
    // #endregion debug-point: fal-ref

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // #region debug-point: fal-ref
      await __dbgReport({
        point: "response_error",
        modelId: modelConfig.id,
        endpoint,
        httpStatus: response.status,
        body_head: typeof errorText === "string" ? errorText.slice(0, 500) : undefined,
      });
      // #endregion debug-point: fal-ref
      throw new Error(`Fal API Error: ${errorText}`);
    }

    const data = await response.json();

    // #region debug-point: fal-ref
    await __dbgReport({
      point: "response_ok",
      modelId: modelConfig.id,
      endpoint,
      has_request_id: !!data?.request_id,
      has_status_url: !!data?.status_url,
      keys: data ? Object.keys(data).slice(0, 30) : [],
    });
    // #endregion debug-point: fal-ref
    return {
        request_id: data.request_id,
        status: 'QUEUED', // Fal returns request_id immediately for queue
        endpoint: data.status_url,
        upstream: {
          provider: "FAL",
          endpoint,
          request_id: data?.request_id,
          status_url: data?.status_url,
          requestPayload: {
            mode,
            has_image_url: !!payload.image_url,
            image_url_kind: __dbgKind(payload.image_url),
            strength: payload.strength,
            image_size: payload.image_size,
          }
        }
    };
  },

  async checkStatus(requestId: string, endpoint: string, apiKey: string): Promise<GenerationResponse> {
      // Use the provided endpoint (which is now status_url) directly
      let statusUrl = endpoint;
      
      // Fallback if endpoint is missing or not a URL (backward compatibility)
      if (!statusUrl || !statusUrl.startsWith('http')) {
           statusUrl = `https://queue.fal.run/requests/${requestId}/status`;
      }
      
      const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
            "Authorization": `Key ${apiKey}`,
            "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
          // If 404 on specific endpoint, try generic one as fallback
          if (response.status === 404 && endpoint) {
               const fallbackUrl = `https://queue.fal.run/requests/${requestId}/status`;
               const fallbackRes = await fetch(fallbackUrl, {
                    method: "GET",
                    headers: { "Authorization": `Key ${apiKey}` }
               });
               if (fallbackRes.ok) {
                   const data = await fallbackRes.json();
                   return {
                       request_id: requestId,
                       status: data.status,
                       images: data.images,
                       error: data.error
                   };
               }
          }
          throw new Error(`Fal Status Error: ${await response.text()}`);
      }

      const data = await response.json();

      // #region debug-point: fal-ref
      await __dbgReport({
        point: "status_ok",
        requestId,
        statusUrl,
        status: data?.status,
        has_images: Array.isArray(data?.images) ? data.images.length : 0,
        keys: data ? Object.keys(data).slice(0, 30) : [],
      });
      // #endregion debug-point: fal-ref
      
      // Fal queue status endpoint does not always include images even when COMPLETED.
      // When available, follow `response_url` to fetch the actual result payload.
      let resultData: any = data;
      if (data?.status === "COMPLETED" && typeof data?.response_url === "string" && data.response_url.startsWith("http")) {
        const res2 = await fetch(data.response_url, {
          method: "GET",
          headers: {
            "Authorization": `Key ${apiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (res2.ok) {
          resultData = await res2.json();
        }
      }

      // Normalize output: Handle different Fal model response structures
      let images = resultData.images || [];
      
      // Handle single 'image' field
      if (!images.length && resultData.image) {
          images = [resultData.image];
      }
      
      // Handle 'output' field (sometimes used in custom workflows)
      if (!images.length && resultData.output) {
          if (Array.isArray(resultData.output)) {
              images = resultData.output;
          } else if (typeof resultData.output === 'object' && resultData.output.url) {
              images = [resultData.output];
          }
      }

      return {
          request_id: requestId,
          status: data.status,
          images: images,
          error: data.error,
          upstream: {
            provider: "FAL",
            status_url: statusUrl,
            status: data?.status,
            response_url: data?.response_url,
          }
      };
  }
};
