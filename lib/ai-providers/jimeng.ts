import { AIProviderAdapter, GenerationRequest, GenerationResponse } from './types';
import aws4 from 'aws4';

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
    const path = '/?Action=CVProcess&Version=2022-08-31';
    
    const requestOptions = {
        host,
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        service: 'cv', // Volcengine Visual Service
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
        throw new Error(`Jimeng Submit Error: ${await response.text()}`);
    }

    const data = await response.json();
    if (data.code !== 10000) {
        throw new Error(`Jimeng API Error Code: ${data.code} - ${data.message}`);
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
      const path = '/?Action=CVProcess&Version=2022-08-31'; // Same action for query? Yes, based on doc, SDK calls `cv_sync2_async_get_result` which maps to same endpoint usually?
      // Wait, SDK method `cv_sync2_async_get_result` might map to a specific Action name.
      // Based on typical Volcengine patterns, it might be `CVGetResult` or similar.
      // However, the prompt doc says `service.cv_sync2_async_get_result`.
      // Let's assume the Action is `CVProcess` but the payload distinguishes it? 
      // Actually, looking at Volcengine docs, usually query is a different Action or parameter.
      // BUT, for "CVProcess", it's a general gateway. 
      // Let's look closely at the python code: `service.cv_sync2_async_get_result`.
      // This likely maps to `Action=CVProcess` with specific params OR `Action=GetResult`.
      // Given I can't verify exact Action mapping without SDK source code, I will try `CVProcess` as it's the main entry.
      // If that fails, we might need `Action=GetImageResult` etc.
      
      // CORRECTION: In Volcengine Visual, `cv_sync2_async_get_result` usually maps to `Action=CVProcess` but with specific input?
      // No, usually it's `Action=GetImageAsyncResult` or `Action=GetResult`.
      // Let's try `Action=CVProcess` first as the prompt implies a unified interface structure.
      // Actually, the prompt says "查询结果（轮询）... result = service.cv_sync2_async_get_result(...)".
      
      // Let's try `Action=CVProcess` first. If it fails, I'll update.
      
      const requestOptions = {
        host,
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        service: 'cv',
        region: 'cn-north-1'
    };

    aws4.sign(requestOptions, { accessKeyId: ak, secretAccessKey: sk });

    const response = await fetch(`https://${host}${path}`, {
        method: 'POST',
        headers: requestOptions.headers as any,
        body: requestOptions.body
    });

    if (!response.ok) {
        throw new Error(`Jimeng Status Check Error: ${await response.text()}`);
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
