export interface APIResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  traceId?: string;
  requestId?: string;
}

export interface APIErrorDetail {
  code?: string | number;
  message: string;
  provider?: string;
  endpoint?: string;
  httpStatus?: number;
  raw?: any;
}

export class APIError extends Error {
  public code: number;
  public detail?: APIErrorDetail;
  public traceId?: string;

  constructor(message: string, code: number = 500, detail?: APIErrorDetail) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.detail = detail;
  }
}

export interface ProviderConfig {
  apiKey?: string;
  secretKey?: string;
  endpoint?: string;
  timeout?: number;
  retries?: number;
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  n?: number;
  [key: string]: any;
}

export interface GenerateResult {
  taskId: string;
  status: 'SUBMITTED' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  images?: string[];
  error?: string;
  providerData?: any;
}
