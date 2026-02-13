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
  // --- Jimeng AI Models ---
  {
    id: 'jimeng-v4.5',
    name: 'Jimeng 4.5 (Volcengine)',
    provider: 'JIMENG',
    envKey: 'ARK_API_KEY', // Ark API Key
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    type: 'image-to-image' // Supports multi-ref
  },

  // --- Fal AI Models ---
  {
    id: 'fal-flux-dev',
    name: 'FLUX.1 [dev] (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/flux-general',
    type: 'image-to-image'
  },
  {
    id: 'fal-flux-schnell',
    name: 'FLUX.1 [schnell] (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/flux-general',
    type: 'image-to-image'
  },
  {
    id: 'fal-fast-sdxl',
    name: 'Fast SDXL (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/fast-sdxl',
    type: 'image-to-image'
  }
];

export const getModelConfig = (modelId: string): AIModelConfig | undefined => {
  return AI_MODELS.find(m => m.id === modelId);
};
