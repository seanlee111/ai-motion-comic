import { TestModule, TestResult } from './types';
import { KlingProvider } from '../api/providers/kling';
import { logger } from '../api/core/logger';

export class KlingTestModule implements TestModule {
  name = 'Kling API Connectivity Test';

  async run(): Promise<TestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      logger.info('Starting Kling API Test...');
      
      const provider = new KlingProvider();
      
      const result = await provider.generate({
        model: 'kling-v2',
        prompt: 'API Connectivity Test',
        aspect_ratio: '1:1',
        n: 1
      });

      const duration = Date.now() - startTime;
      
      if (result.status === 'SUBMITTED' || result.status === 'IN_PROGRESS' || result.status === 'COMPLETED') {
          return {
              name: this.name,
              status: 'SUCCESS',
              duration,
              timestamp,
              details: {
                  taskId: result.taskId,
                  providerData: result.providerData
              }
          };
      } else {
          throw new Error(`Unexpected status: ${result.status}`);
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
