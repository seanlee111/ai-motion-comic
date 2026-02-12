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
  // --- Kling AI Models ---
  {
    id: 'kling-v1',
    name: 'Kling 1.0 (Kuaishou)',
    provider: 'KLING',
    envKey: 'KLING_ACCESS_KEY', // Kling requires AK/SK to generate JWT
    endpoint: 'https://api.klingai.com/v1/images/generations', 
    type: 'text-to-image'
  },

  // --- Jimeng AI Models ---
  {
    id: 'jimeng-v4',
    name: 'Jimeng 4.0 (Volcengine)',
    provider: 'JIMENG',
    envKey: 'JIMENG_AK', // Jimeng requires AK/SK pair, we'll store AK here and assume SK is JIMENG_SK
    // Official Endpoint for Visual Service
    endpoint: 'https://visual.volcengineapi.com', 
    type: 'text-to-image'
  },

  // --- Fal AI Models ---
  {
    id: 'fal-flux-dev',
    name: 'FLUX.1 [dev] (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/flux-general', // Use flux-general for better compatibility
    type: 'image-to-image'
  },
  {
    id: 'fal-flux-schnell',
    name: 'FLUX.1 [schnell] (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/flux-general', // Use flux-general
    type: 'image-to-image'
  },
  {
    id: 'fal-fast-sdxl',
    name: 'Fast SDXL (Fal)',
    provider: 'FAL',
    envKey: 'FAL_KEY',
    endpoint: 'https://queue.fal.run/fal-ai/fast-sdxl', // Fast SDXL supports img2img
    type: 'image-to-image'
  }
];

export const getModelConfig = (modelId: string): AIModelConfig | undefined => {
  return AI_MODELS.find(m => m.id === modelId);
};
