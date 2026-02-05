export type AIProvider = 'FAL' | 'KLING' | 'JIMENG';

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  envKey: string; // The environment variable name for the API key
  endpoint?: string; // Optional specific endpoint override
  type: 'text-to-image' | 'image-to-image' | 'inpainting' | 'video';
}

export const AI_MODELS: AIModelConfig[] = [
  // --- Fal AI Models ---
  {
    id: 'fal-flux-pro-v1.1',
    name: 'Flux Pro 1.1 (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/flux-pro/v1.1',
    type: 'text-to-image'
  },
  {
    id: 'fal-flux-dev',
    name: 'Flux Dev (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/flux/dev',
    type: 'text-to-image'
  },
  {
    id: 'fal-flux-schnell',
    name: 'Flux Schnell (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/flux/schnell',
    type: 'text-to-image'
  },

  // --- Kling AI Models (Placeholder) ---
  {
    id: 'kling-v1',
    name: 'Kling 1.0 (Experimental)',
    provider: 'KLING',
    envKey: 'KLING_KEY',
    // TODO: Update with official Kling API endpoint when available
    endpoint: 'https://api.klingai.com/v1/images/generations', 
    type: 'text-to-image'
  },

  // --- Jimeng AI Models (Placeholder) ---
  {
    id: 'jimeng-v1',
    name: 'Jimeng (Experimental)',
    provider: 'JIMENG',
    envKey: 'JIMENG_KEY',
    // TODO: Update with official Jimeng/Volcengine API endpoint
    endpoint: 'https://api.jimeng.volcengine.com/v1/generate', 
    type: 'text-to-image'
  }
];

export const getModelConfig = (modelId: string): AIModelConfig | undefined => {
  return AI_MODELS.find(m => m.id === modelId);
};
