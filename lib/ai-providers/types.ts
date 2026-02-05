import { AIModelConfig } from '../ai-models';

export interface GenerationRequest {
  prompt: string;
  modelConfig: AIModelConfig;
  aspect_ratio?: string;
  mode?: string;
  image_url?: string;
  mask_url?: string;
  strength?: number;
}

export interface GenerationResponse {
  request_id: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  images?: { url: string }[];
  endpoint?: string; // For polling
  error?: string;
}

export interface AIProviderAdapter {
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  checkStatus(requestId: string, endpoint?: string, apiKey?: string): Promise<GenerationResponse>;
}
