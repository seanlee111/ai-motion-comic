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
      safety_tolerance: "2",
    };

    let endpoint = modelConfig.endpoint || "https://queue.fal.run/fal-ai/flux-pro/v1.1";

    if (mode === "image-to-image" && image_url) {
      payload.image_url = image_url;
      payload.strength = strength || 0.75;
      // Fal Flux Dev usually handles img2img
      if (modelConfig.id.includes('flux')) {
         endpoint = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
      }
    }

    if (mode === "inpainting" && image_url && mask_url) {
        payload.image_url = image_url;
        payload.mask_url = mask_url;
        endpoint = "https://queue.fal.run/fal-ai/flux-pro/v1.1-inpainting"; // Example endpoint
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
        endpoint // Pass back endpoint for polling
    };
  },

  async checkStatus(requestId: string, endpoint: string, apiKey: string): Promise<GenerationResponse> {
      // Fal uses a standard polling URL pattern usually, but here we passed the original endpoint
      // Actually Fal status URL is usually `https://queue.fal.run/requests/{request_id}/status`
      // Or `{endpoint}/requests/{request_id}` if it's a specific queue
      
      const statusUrl = `https://queue.fal.run/requests/${requestId}/status`;
      
      const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
            "Authorization": `Key ${apiKey}`,
            "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
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
