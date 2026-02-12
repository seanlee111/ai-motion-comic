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

    // Fal usually works with 'image_url' parameter for image-to-image
    // req should have 'imageUrl' or similar if it's image-to-image
    // But our generic GenerateRequest might not strictly define it yet.
    // Let's assume req.imageUrl is passed for image-to-image.
    
    const payload: any = {
        prompt: req.prompt,
        image_size: req.aspect_ratio === '1:1' ? 'square_hd' : 
                    req.aspect_ratio === '16:9' ? 'landscape_16_9' : 
                    req.aspect_ratio === '9:16' ? 'portrait_16_9' : 'square_hd',
        num_inference_steps: 30,
        enable_safety_checker: false
    };

    if (req.imageUrl) {
        payload.image_url = req.imageUrl;
        payload.strength = 0.75; // Default strength for img2img
    }

    // Adjust payload for specific models if needed
    if (req.model === 'fal-fast-sdxl') {
       // SDXL specific params if any
    }

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

  public async checkStatus(taskId: string): Promise<GenerateResult> {
      // Fal queue status check requires specific URL pattern:
      // https://queue.fal.run/fal-ai/flux/dev/requests/{request_id}/status
      // But we don't store which model generated the task easily unless we pass it.
      // However, we can use the `status_url` returned in submit response if we stored it.
      // Since we don't persist state here, we rely on the providerData logic or standard pattern.
      // Fal also allows checking status via `https://queue.fal.run/requests/{request_id}/status` globally?
      // Let's verify standard pattern: https://queue.fal.run/requests/{request_id}
      
      const statusUrl = `https://queue.fal.run/requests/${taskId}/status`;

      const response = await this.client.request<any>(statusUrl, {
          method: 'GET',
          headers: {
              'Authorization': `Key ${this.apiKey}`
          }
      });

      let status: GenerateResult['status'] = 'IN_PROGRESS';
      let images: string[] = [];
      let error: string | undefined;

      if (response.status === 'COMPLETED') {
          status = 'COMPLETED';
          // Fetch result
          const resultUrl = `https://queue.fal.run/requests/${taskId}`;
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
