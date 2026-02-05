import { AIProvider } from '../ai-models';
import { AIProviderAdapter } from './types';
import { FalProvider } from './fal';
import { KlingProvider } from './kling';
import { JimengProvider } from './jimeng';

export const ProviderRegistry: Record<AIProvider, AIProviderAdapter> = {
  FAL: FalProvider,
  KLING: KlingProvider,
  JIMENG: JimengProvider
};

export const getProvider = (provider: AIProvider): AIProviderAdapter => {
  const adapter = ProviderRegistry[provider];
  if (!adapter) {
    throw new Error(`Provider adapter for ${provider} not found`);
  }
  return adapter;
};
