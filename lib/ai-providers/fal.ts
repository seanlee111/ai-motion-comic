import { AIProviderAdapter, GenerationRequest, GenerationResponse } from './types';

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
      // Use general endpoint for flux img2img as per latest docs
      if (modelConfig.id.includes('flux')) {
         endpoint = "https://queue.fal.run/fal-ai/flux-general";
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
      throw new Error(`Fal API Error: ${errorText}`);
    }

    const data = await response.json();
    return {
        request_id: data.request_id,
        status: 'QUEUED', // Fal returns request_id immediately for queue
        endpoint: data.status_url // Return status_url for polling
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
      return {
          request_id: requestId,
          status: data.status,
          images: data.images,
          error: data.error
      };
  }
};
