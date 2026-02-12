import { TestModule, TestResult } from './types';
import { JimengProvider } from '../api/providers/jimeng';
import { logger } from '../api/core/logger';

export class JimengTestModule implements TestModule {
  name = 'Jimeng API Connectivity Test';

  async run(): Promise<TestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      logger.info('Starting Jimeng API Test...');
      
      const provider = new JimengProvider();
      
      // Attempt a dry-run generation or a lightweight check if possible.
      // Since generate actually submits a task, we might want to check if there's a lighter way,
      // but the requirement is to verify connectivity. Submitting a task is the best way to verify Auth.
      // We will submit a simple prompt.
      
      const result = await provider.generate({
        model: 'jimeng-v4',
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
