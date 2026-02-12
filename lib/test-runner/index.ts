import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { TestModule, TestResult } from './types';
import { JimengTestModule } from './jimeng';
import { KlingTestModule } from './kling';
import { DeepSeekTestModule } from './deepseek';
import * as fs from 'fs';

export class TestRunner {
  private modules: TestModule[] = [];

  constructor() {
    this.modules.push(new JimengTestModule());
    this.modules.push(new KlingTestModule());
    this.modules.push(new DeepSeekTestModule());
  }

  async runAll(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    console.log('🚀 Starting API Connectivity Tests...\n');

    for (const module of this.modules) {
      console.log(`Running ${module.name}...`);
      const result = await module.run();
      results.push(result);
      
      if (result.status === 'SUCCESS') {
        console.log(`✅ ${module.name} PASSED (${result.duration}ms)`);
      } else {
        console.error(`❌ ${module.name} FAILED (${result.duration}ms)`);
        console.error(`   Error: ${result.error}`);
      }
      console.log('-----------------------------------');
    }

    this.generateReport(results);
    return results;
  }

  private generateReport(results: TestResult[]) {
    const reportPath = path.join(process.cwd(), 'api-test-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'SUCCESS').length,
        failed: results.filter(r => r.status === 'FAILURE').length
      },
      results
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Test Report generated at: ${reportPath}`);
  }
}

// Execute if run directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAll().catch(console.error);
}
