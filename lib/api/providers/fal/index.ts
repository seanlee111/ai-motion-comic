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

    // IP-Adapter & LoRA Support logic
    // Currently placeholder, requires user to provide file URLs or paths
    // Example:
    // if (req.loras) {
    //     payload.loras = req.loras.map(l => ({ path: l.path, scale: l.scale }));
    // }
    
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
      // Fal requires model-specific endpoint for status check if we use the queue endpoint format
      // Pattern: https://queue.fal.run/{owner}/{model}/requests/{request_id}/status
      // Since we don't have the model stored in this stateless check, we should ideally use the
      // status_url returned during generation. 
      // However, Fal also supports a global request status endpoint:
      // https://queue.fal.run/fal-ai/flux/dev/requests/{request_id}/status (example)
      //
      // CRITICAL FIX: The global pattern `https://queue.fal.run/requests/{request_id}/status` is NOT reliable
      // for all models. We must construct the URL based on the known model endpoints we use,
      // OR update the interface to pass model ID.
      // 
      // Given the stateless constraint, we will iterate known models to find the task 
      // (inefficient but works for limited models) OR assume a default if not provided.
      // Better approach: Update GenerateResult to include providerData with statusUrl, 
      // and frontend/caller should pass it back. But `checkStatus` signature is `(taskId: string)`.
      
      // Fallback Strategy: Try the most common model endpoint (flux/dev) first.
      // Real fix should be architecture update to pass model/statusUrl.
      // For now, let's try to construct a generic URL or use a known one.
      
      // Let's try the direct request status endpoint if available, otherwise default to flux-dev
      // Note: This is a limitation of the current interface.
      
      const knownEndpoints = [
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
                  skipErrorHandler: true // Don't throw immediately
              });
              if (response && response.status) {
                  usedEndpoint = modelPath;
                  break; 
              }
          } catch (e) {
              // Continue to next model
          }
      }

      if (!response) {
           throw new APIError('Fal Status Check Failed: Task not found in known models', 404);
      }

      let status: GenerateResult['status'] = 'IN_PROGRESS';
      let images: string[] = [];
      let error: string | undefined;

      if (response.status === 'COMPLETED') {
          status = 'COMPLETED';
          // Fetch result
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
