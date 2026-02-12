export interface TestResult {
  name: string;
  status: 'SUCCESS' | 'FAILURE';
  duration: number;
  timestamp: string;
  details?: any;
  error?: string;
}

export interface TestModule {
  name: string;
  run(): Promise<TestResult>;
}
