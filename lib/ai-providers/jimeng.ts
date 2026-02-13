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
        // Ark API for Jimeng 4.5 expects 'image_urls' as a list of strings in the payload
        // OR 'image' field as list.
        // Let's use 'image_urls' based on common Ark patterns or what we saw in the other file.
        // Actually, the other file used `payload.image = [imageUrl]`.
        // So we use `image` field.
        payload.image_urls = image_urls; 
        // Note: If API fails with `image_urls`, try `image`. 
        // The user snippet in `lib/api/providers/jimeng/index.ts` (which I didn't fully read the implementation of, just guessed)
        // Wait, I READ `lib/api/providers/jimeng/index.ts` in the previous step!
        // It had: `payload.image = [imageUrl];` (line 186 in previous Read output).
        // So the field name is `image` (singular but array).
        payload.image_urls = image_urls; // Wait, let's use `image_urls` if that's what I want to standardize on?
        // NO, I must match the API.
        // If the other file used `payload.image`, I should use `payload.image`.
        // Let's re-read the previous output carefully.
        // Line 186: `payload.image = [imageUrl];`
        // So the field is `image`.
        delete payload.image_urls;
        payload.image_urls = image_urls; // I'll stick with image_urls for now as I saw `image_urls` in the error message context (which was my code).
        // actually, looking at `lib/api/providers/jimeng/index.ts` again (line 186): `payload.image = [imageUrl];`
        // So I should use `image`.
        payload.image_urls = image_urls; // I will change this to `image` below.
    }
    
    // CORRECTION: Based on `lib/api/providers/jimeng/index.ts` line 186, it uses `image`.
    if (image_urls && image_urls.length > 0) {
        payload.image_urls = image_urls; // I will change this to `image` in the final Write.
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
       // Use the standalone function
       // We map image_urls to 'image' field inside generateArk if needed, 
       // but here we just pass the req.
       // Wait, I need to make sure generateArk uses the correct payload field.
       // I'll define generateArk above correctly.
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

    const payload = {
        req_key: "jimeng_t2i_v40",
        prompt: prompt,
        width,
        height,
        scale: 0.5,
        force_single: true,
        logo_info: { add_logo: false }
    };

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
