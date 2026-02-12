import { TestModule, TestResult } from './types';
import { DeepSeekProvider } from '../api/providers/deepseek';
import { logger } from '../api/core/logger';

export class DeepSeekTestModule implements TestModule {
  name = 'DeepSeek API Connectivity Test';

  async run(): Promise<TestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      logger.info('Starting DeepSeek API Test...');
      
      const provider = new DeepSeekProvider();
      
      // Generate a short script to verify connectivity
      const result = await provider.generateScript('A cat jumping over a moon');

      const duration = Date.now() - startTime;
      
      if (result && result.length > 0) {
          return {
              name: this.name,
              status: 'SUCCESS',
              duration,
              timestamp,
              details: {
                  scriptPreview: result.slice(0, 100) + '...'
              }
          };
      } else {
          throw new Error('Empty response from DeepSeek');
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        name: this.name,
        status: 'FAILURE',
        duration,
        timestamp,
        error: error.message,
        details: error.detail || error
      };
    }
  }
}
