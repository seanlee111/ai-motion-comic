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

export const JimengProvider: AIProviderAdapter = {
  async generate(req: GenerationRequest): Promise<GenerationResponse> {
    const { modelConfig, prompt, aspect_ratio } = req;
    
    // Credentials
    const ak = process.env.JIMENG_AK;
    const sk = process.env.JIMENG_SK;
    
    if (!ak || !sk) {
        throw new Error("Missing Jimeng Credentials (JIMENG_AK/JIMENG_SK)");
    }

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
        },
        body: JSON.stringify(payload),
        service: 'visual',
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
          service: "visual",
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
          service: "visual",
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
          service: "visual",
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
      const ak = process.env.JIMENG_AK;
      const sk = process.env.JIMENG_SK;

      if (!ak || !sk) throw new Error("Missing Jimeng Credentials");

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
        },
        body: JSON.stringify(payload),
        service: 'visual',
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
          service: "visual",
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
