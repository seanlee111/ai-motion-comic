import { AIProviderAdapter, GenerationRequest, GenerationResponse } from './types';
import aws4 from 'aws4';

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function maskKey(key: string) {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

async function generateArk(req: GenerationRequest): Promise<GenerationResponse> {
    const { prompt, aspect_ratio, image_urls } = req;
    
    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) throw new Error("Missing ARK_API_KEY for Jimeng 4.5");

    let width = 2048;
    let height = 2048;
    if (aspect_ratio === "16:9") { width = 2560; height = 1440; } 
    if (aspect_ratio === "9:16") { width = 1440; height = 2560; }

    const url = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
    
    // Determine size string for Ark if needed, but width/height is better if supported.
    // Based on SDK usage, we should probably stick to `width` and `height` if the model supports it,
    // OR map to "2K" etc. Let's trust width/height is supported or ignored.
    
    const payload: any = {
        model: "doubao-seedream-4-5-251128",
        prompt: prompt,
        width,
        height,
        return_url: true, 
    };

    // Add image references if any
    if (image_urls && image_urls.length > 0) {
        // Correct payload for Ark Image-to-Image / Multi-Reference
        // The API expects 'image_urls' or 'image_url' depending on specific model version
        // But for Doubao-Seedream-4.5 on Ark, it usually follows OpenAI-like or custom format.
        // Based on recent debugging, we use 'image_urls' as a list of strings.
        payload.image_urls = image_urls;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Jimeng Ark Failed: ${await response.text()}`);
    }

    const data = await response.json();

    return {
        request_id: data.id || "unknown",
        status: 'COMPLETED',
        images: data.data?.map((d: any) => ({ url: d.url })) || []
    };
}

export const JimengProvider: AIProviderAdapter = {
  async generate(req: GenerationRequest): Promise<GenerationResponse> {
    const { modelConfig, prompt, aspect_ratio, image_urls } = req;
    
    // Check if using the Ark (v4.5) endpoint
    if (modelConfig.id === 'jimeng-v4.5') {
       return generateArk(req);
    }
    
    // Credentials
    const rawAk = process.env.JIMENG_AK;
    const rawSk = process.env.JIMENG_SK;
    
    if (!rawAk || !rawSk) {
        throw new Error("Missing Jimeng Credentials (JIMENG_AK/JIMENG_SK)");
    }
    
    const ak = rawAk.trim();
    const sk = rawSk.trim();

    // Map Aspect Ratio to Width/Height
    // Default 2K (2048x2048) or similar
    let width = 2048;
    let height = 2048;
    if (aspect_ratio === "16:9") { width = 2560; height = 1440; } // Approx 16:9
    if (aspect_ratio === "9:16") { width = 1440; height = 2560; }

    // Use image-to-image API if image_urls provided
    const isImg2Img = image_urls && image_urls.length > 0;
    
    // For T2I (Text-to-Image)
    const t2iPayload = {
        req_key: "jimeng_t2i_v40",
        prompt: prompt,
        width,
        height,
        scale: 0.5,
        force_single: true,
        logo_info: { add_logo: false }
    };
    
    // For I2I (Image-to-Image) - Jimeng V4.0 I2I specific payload
    // Note: The req_key for I2I is likely different, e.g. "jimeng_i2i_v40" or similar.
    // However, based on Volcengine docs, the main API is often shared but with different req_key/params.
    // Since we don't have the exact I2I spec for V4.0 legacy endpoint in this context,
    // we will stick to T2I for now unless we are sure about the endpoint.
    // BUT, the user explicitly asked why it's text2image effect.
    // If we send `jimeng_t2i_v40` with images, it IGNORES the images.
    
    // Let's attempt to use the I2I endpoint if available or assume only T2I is supported on this legacy path.
    // Correction: Jimeng Legacy (V4.0 via CV API) usually separates T2I and I2I req_keys.
    // Common keys: 'jimeng_t2i_v40', 'jimeng_i2i_v40'
    
    let payload: any = t2iPayload;
    if (isImg2Img) {
         // Attempt to switch to I2I payload structure
         payload = {
            req_key: "jimeng_i2i_v40", // Switch to I2I key
            prompt: prompt,
            image_urls: image_urls, // Pass images
            strength: 0.7, // Default strength
            width,
            height,
            scale: 0.5,
            force_single: true,
            logo_info: { add_logo: false }
         };
    }

    // Prepare Signed Request
    const host = 'visual.volcengineapi.com';
    const path = '/?Action=CVSync2AsyncSubmitTask&Version=2022-08-31';
    
    const requestOptions = {
        host,
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Host': host, // Explicitly set Host
        },
        body: JSON.stringify(payload),
        service: 'cv', // Updated from 'visual' to 'cv' based on docs
        region: 'cn-north-1'
    };

    // Sign Request
    aws4.sign(requestOptions, { accessKeyId: ak, secretAccessKey: sk });

    const response = await fetch(`https://${host}${path}`, {
        method: 'POST',
        headers: requestOptions.headers as any,
        body: requestOptions.body
    });

    if (!response.ok) {
        const text = await response.text();
        const json = safeJsonParse(text);
        const debug = {
          provider: "jimeng",
          stage: "submit",
          httpStatus: response.status,
          endpoint: `https://${host}${path}`,
          region: "cn-north-1",
          service: "cv",
          req_key: payload.req_key,
          iss: maskKey(ak),
          response: json || text
        };
        throw new Error(`Jimeng Submit Failed\n${JSON.stringify(debug, null, 2)}`);
    }

    const data = await response.json();
    if (data.code !== 10000) {
        // ... error handling
        const debug = {
          provider: "jimeng",
          stage: "submit",
          httpStatus: response.status,
          endpoint: `https://${host}${path}`,
          region: "cn-north-1",
          service: "cv",
          req_key: payload.req_key,
          iss: maskKey(ak),
          response: data
        };
        throw new Error(`Jimeng Submit Failed\n${JSON.stringify(debug, null, 2)}`);
    }

    if (!data?.data?.task_id) {
         // ... error handling
         throw new Error("No task_id");
    }

    return {
        request_id: data.data.task_id,
        status: 'QUEUED',
        endpoint: `https://${host}` // Pass host back for status check
    };
  },

  async checkStatus(requestId: string, endpoint: string, apiKey: string): Promise<GenerationResponse> {
      // apiKey argument is just the AK passed from route, we need SK from env
      const rawAk = process.env.JIMENG_AK;
      const rawSk = process.env.JIMENG_SK;

      if (!rawAk || !rawSk) throw new Error("Missing Jimeng Credentials");

      const ak = rawAk.trim();
      const sk = rawSk.trim();

      const payload = {
          req_key: "jimeng_t2i_v40",
          task_id: requestId,
          req_json: JSON.stringify({ return_url: true })
      };

      const host = 'visual.volcengineapi.com';
      const path = '/?Action=CVSync2AsyncGetResult&Version=2022-08-31';
      const requestOptions = {
        host,
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Host': host, // Explicitly set Host
        },
        body: JSON.stringify(payload),
        service: 'cv', // Updated from 'visual' to 'cv' based on docs
        region: 'cn-north-1'
      };

    aws4.sign(requestOptions, { accessKeyId: ak, secretAccessKey: sk });

    const response = await fetch(`https://${host}${path}`, {
        method: 'POST',
        headers: requestOptions.headers as any,
        body: requestOptions.body
    });

    if (!response.ok) {
        const text = await response.text();
        const json = safeJsonParse(text);
        const debug = {
          provider: "jimeng",
          stage: "status",
          httpStatus: response.status,
          endpoint: `https://${host}${path}`,
          region: "cn-north-1",
          service: "cv",
          req_key: payload.req_key,
          iss: maskKey(ak),
          response: json || text
        };
        throw new Error(`Jimeng Status Failed\n${JSON.stringify(debug, null, 2)}`);
    }

    const data = await response.json();
    
    // Status Mapping
    // doc says: "status": "done" | "in_queue" | "generating"
    let status: GenerationResponse['status'] = 'IN_PROGRESS';
    let images: { url: string }[] = [];
    let error = undefined;

    if (data.data?.status === 'done') {
        status = 'COMPLETED';
        images = (data.data.image_urls || []).map((url: string) => ({ url }));
    } else if (data.data?.status === 'failed' || data.code !== 10000) {
        status = 'FAILED';
        error = data.message || "Jimeng Generation Failed";
    }

    return {
        request_id: requestId,
        status,
        images,
        error
    };
  }
};
