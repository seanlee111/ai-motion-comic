import { HttpClient } from '../../core/client';
import { APIError, GenerateRequest, GenerateResult } from '../../core/types';
import { getModelConfig } from '@/lib/ai-models';

export class FalProvider {
  private client: HttpClient;
  private apiKey: string;

  constructor() {
    this.client = new HttpClient('', { // Base URL depends on model
      timeout: 60000, // Fal queue might take time
      retries: 1
    });

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      throw new APIError('Missing Fal Credentials', 500);
    }
    this.apiKey = apiKey.trim();
  }

  public async generate(req: GenerateRequest): Promise<GenerateResult> {
    const modelConfig = getModelConfig(req.model);
    if (!modelConfig || !modelConfig.endpoint) {
        throw new APIError('Invalid Model Configuration for Fal', 400);
    }

    const payload: any = {
        prompt: req.prompt,
        image_size: req.aspect_ratio === '1:1' ? 'square_hd' : 
                    req.aspect_ratio === '16:9' ? 'landscape_16_9' : 
                    req.aspect_ratio === '9:16' ? 'portrait_16_9' : 'square_hd',
        num_inference_steps: req.model.includes('flux') ? 28 : 30, // Flux: 28, SDXL: 30
        enable_safety_checker: false
    };

    if (req.model.includes('flux')) {
        payload.guidance_scale = 3.5;
    } else if (req.model.includes('sdxl')) {
        payload.guidance_scale = 7.5;
    }

    // Handle Image-to-Image
    if (req.imageUrl) {
        payload.image_url = req.imageUrl;
        payload.strength = 0.85; // Default strength from reference
    }

    // IP-Adapter & LoRA Support logic (Placeholder for future expansion)
    // if (req.loras) {
    //     payload.loras = req.loras.map(l => ({ path: l.path, scale: l.scale }));
    // }
    
    // Check specific model requirements based on reference
    // Flux uses fal-ai/flux-general which supports image_prompts for IP-Adapter
    // SDXL uses fal-ai/fast-sdxl which uses ip_adapter for IP-Adapter

    const response = await this.client.request<any>(modelConfig.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    // Fal returns { images: [{ url: ... }] } directly for sync endpoints, 
    // or { request_id: ... } for async queue endpoints.
    // The endpoints in ai-models.ts are queue endpoints (queue.fal.run).
    
    if (response.request_id) {
         return {
            taskId: response.request_id,
            status: 'SUBMITTED',
            providerData: { 
                endpoint: modelConfig.endpoint,
                status_url: response.status_url,
                response_url: response.response_url
            }
        };
    } else if (response.images && response.images.length > 0) {
        // Direct result (unlikely for queue endpoint but possible)
        return {
            taskId: 'sync-response',
            status: 'COMPLETED',
            images: response.images.map((img: any) => img.url)
        };
    }

    throw new APIError('Fal Submit Failed', 500, {
        message: 'Unknown Fal Response',
        raw: response
    });
  }

  public async checkStatus(taskId: string, endpoint?: string): Promise<GenerateResult> {
      // If we have a specific endpoint or status URL passed, use it directly.
      // The backend route should pass `endpoint` (which might be the full status_url or just model path)
      // Since `checkStatus` in interface is (taskId: string), we might need to rely on the caller passing it
      // via a slightly modified call or encoded in taskId. 
      // BUT, in our `route.ts`, we see `checkStatus(body.taskId)`. 
      // To fix this properly without breaking interface for other providers:
      // We can overload or check if taskId is a JSON string containing more info? No, that's hacky.
      // 
      // Better: The caller (route.ts) has access to `providerData` if the client sends it back.
      // Let's assume the client sends `endpoint` in the body for status check if available.
      
      let statusUrl = '';
      let resultUrl = '';

      if (endpoint && endpoint.startsWith('https')) {
          statusUrl = endpoint; // Assume it's the full status_url
          // If statusUrl is .../status, resultUrl is usually without /status
          resultUrl = statusUrl.replace('/status', '');
      } else if (endpoint) {
          // Endpoint is model path like 'fal-ai/flux/dev'
           statusUrl = `https://queue.fal.run/${endpoint}/requests/${taskId}/status`;
           resultUrl = `https://queue.fal.run/${endpoint}/requests/${taskId}`;
      } else {
          // Fallback to iterating known models (inefficient legacy mode)
          return this.checkStatusLegacy(taskId);
      }

      try {
        const response = await this.client.request<any>(statusUrl, {
            method: 'GET',
            headers: { 'Authorization': `Key ${this.apiKey}` }
        });

        let status: GenerateResult['status'] = 'IN_PROGRESS';
        let images: string[] = [];
        let error: string | undefined;

        if (response.status === 'COMPLETED') {
            status = 'COMPLETED';
            // Fetch result
            // IMPORTANT: For some endpoints like image-to-image, the result might already be in the status response?
            // Fal queue API usually returns result in a separate call or in the status response if it's "sync" mode but here it is async.
            // Wait, for fal queue, the result is at /requests/{id} (without /status) or inside the status payload if using webhooks?
            // Actually, `queue.fal.run/.../requests/{id}` returns the result JSON.
            // `queue.fal.run/.../requests/{id}/status` returns the status JSON.
            
            const resultResponse = await this.client.request<any>(resultUrl, {
                method: 'GET',
                headers: { 'Authorization': `Key ${this.apiKey}` }
            });
            
            if (resultResponse.images) {
                images = resultResponse.images.map((img: any) => img.url);
            }
        } else if (response.status === 'FAILED') {
            status = 'FAILED';
            error = response.error || 'Fal Generation Failed';
        }

        return {
            taskId,
            status,
            images,
            error
        };

      } catch (e: any) {
          // If 404, maybe try legacy check?
          if (e.code === 404) return this.checkStatusLegacy(taskId);
          throw e;
      }
  }

  private async checkStatusLegacy(taskId: string): Promise<GenerateResult> {
      const knownEndpoints = [
          'fal-ai/flux/dev/image-to-image',
          'fal-ai/fast-sdxl/image-to-image',
          'fal-ai/flux/dev',
          'fal-ai/fast-sdxl'
      ];
      
      let response;
      let usedEndpoint = '';

      for (const modelPath of knownEndpoints) {
          try {
              const statusUrl = `https://queue.fal.run/${modelPath}/requests/${taskId}/status`;
              response = await this.client.request<any>(statusUrl, {
                  method: 'GET',
                  headers: { 'Authorization': `Key ${this.apiKey}` },
                  skipErrorHandler: true
              });
              if (response && response.status) {
                  usedEndpoint = modelPath;
                  break; 
              }
          } catch (e) {
              // Continue
          }
      }

      if (!response) {
           throw new APIError('Fal Status Check Failed: Task not found', 404);
      }

      let status: GenerateResult['status'] = 'IN_PROGRESS';
      let images: string[] = [];
      let error: string | undefined;

      if (response.status === 'COMPLETED') {
          status = 'COMPLETED';
          const resultUrl = `https://queue.fal.run/${usedEndpoint}/requests/${taskId}`;
          const resultResponse = await this.client.request<any>(resultUrl, {
               method: 'GET',
               headers: { 'Authorization': `Key ${this.apiKey}` }
          });
          
          if (resultResponse.images) {
              images = resultResponse.images.map((img: any) => img.url);
          }
      } else if (response.status === 'FAILED') {
          status = 'FAILED';
          error = response.error || 'Fal Generation Failed';
      }

      return {
          taskId,
          status,
          images,
          error
      };
  }
}
