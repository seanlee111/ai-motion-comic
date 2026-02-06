import { AIProviderAdapter, GenerationRequest, GenerationResponse } from './types';
import jwt from 'jsonwebtoken';

function generateKlingToken(accessKey: string, secretKey: string): string {
    const payload = {
        iss: accessKey,
        exp: Math.floor(Date.now() / 1000) + 1800, // 30 mins validity
        nbf: Math.floor(Date.now() / 1000) - 5
    };
    return jwt.sign(payload, secretKey, { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } });
}

export const KlingProvider: AIProviderAdapter = {
  async generate(req: GenerationRequest): Promise<GenerationResponse> {
    const { modelConfig, prompt, aspect_ratio } = req;
    
    // Auth
    const ak = process.env.KLING_ACCESS_KEY;
    const sk = process.env.KLING_SECRET_KEY;
    if (!ak || !sk) throw new Error("Missing Kling Credentials (KLING_ACCESS_KEY/KLING_SECRET_KEY)");

    const token = generateKlingToken(ak, sk);
    const endpoint = modelConfig.endpoint || "https://api.klingai.com/v1/images/generations";

    // Payload
    const payload = {
        model_name: "kling-v1", // Default, can be overridden if we add more Kling models to config
        prompt,
        aspect_ratio: aspect_ratio || "16:9",
        n: 1
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Kling Submit Error: ${await response.text()}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
        throw new Error(`Kling API Error: ${data.message} (Code ${data.code})`);
    }

    return {
        request_id: data.data.task_id,
        status: 'QUEUED',
        endpoint: endpoint // Used to derive status url
    };
  },

  async checkStatus(requestId: string, endpoint: string, apiKey: string): Promise<GenerationResponse> {
      // Re-generate token (stateless check)
      const ak = process.env.KLING_ACCESS_KEY;
      const sk = process.env.KLING_SECRET_KEY;
      if (!ak || !sk) throw new Error("Missing Kling Credentials");
      
      const token = generateKlingToken(ak, sk);
      
      // Construct Status URL: /v1/images/generations/{task_id}
      // Endpoint passed is usually ".../generations"
      const statusUrl = `${endpoint}/${requestId}`;

      const response = await fetch(statusUrl, {
          method: "GET",
          headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
          }
      });

      if (!response.ok) {
          throw new Error(`Kling Status Error: ${await response.text()}`);
      }

      const data = await response.json();
      if (data.code !== 0) {
          throw new Error(`Kling API Error: ${data.message}`);
      }

      const taskData = data.data;
      let status: GenerationResponse['status'] = 'IN_PROGRESS';
      let images: { url: string }[] = [];
      let error = undefined;

      // Status mapping: submitted, processing, succeed, failed
      if (taskData.task_status === 'succeed') {
          status = 'COMPLETED';
          images = (taskData.task_result?.images || []).map((img: any) => ({ url: img.url }));
      } else if (taskData.task_status === 'failed') {
          status = 'FAILED';
          error = taskData.task_status_msg || "Kling Generation Failed";
      }

      return {
          request_id: requestId,
          status,
          images,
          error
      };
  }
};
