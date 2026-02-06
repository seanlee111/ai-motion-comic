import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { APIError } from './types';

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  params?: Record<string, string | number | boolean>;
  requestId?: string;
  skipErrorHandler?: boolean;
}

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_RETRIES = 1;

export class HttpClient {
  private baseUrl: string;
  private defaultOptions: RequestOptions;

  constructor(baseUrl: string = '', defaultOptions: RequestOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = defaultOptions;
  }

  public async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const method = options.method || 'GET';
    const reqId = options.requestId || uuidv4();
    const timeout = options.timeout ?? this.defaultOptions.timeout ?? DEFAULT_TIMEOUT;
    const retries = options.retries ?? this.defaultOptions.retries ?? DEFAULT_RETRIES;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const startTime = Date.now();

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...this.defaultOptions.headers,
          ...options.headers,
        };

        logger.request(reqId, method, url, headers, options.body ? JSON.parse(options.body as string) : undefined);

        const response = await fetch(url, {
          ...this.defaultOptions,
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        let data: any;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch {
                data = await response.text();
            }
        } else {
            data = await response.text();
        }

        logger.response(reqId, response.status, data, duration);

        if (!response.ok) {
            // Determine if retryable
            const isRetryable = attempt < retries && (response.status >= 500 || response.status === 429);
            
            if (isRetryable) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                logger.warn(`Request failed with ${response.status}, retrying in ${delay}ms... (Attempt ${attempt + 1}/${retries + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            throw new APIError(`HTTP Error ${response.status}`, response.status, {
                message: typeof data === 'string' ? data : (data.message || 'Unknown Error'),
                httpStatus: response.status,
                raw: data,
                endpoint: url
            });
        }

        return data as T;

      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;
        
        if (error.name === 'AbortError') {
             logger.warn(`Request timeout after ${timeout}ms`, { reqId, url });
        } else {
             logger.error(`Request failed`, error, { reqId, url });
        }

        const isRetryable = attempt < retries && error.name !== 'AbortError'; // Don't retry timeouts usually, or maybe yes? Let's say yes if network issue
        if (isRetryable) {
             const delay = Math.pow(2, attempt) * 1000;
             await new Promise(resolve => setTimeout(resolve, delay));
             continue;
        }
      }
    }

    if (lastError instanceof APIError) {
        throw lastError;
    }

    throw new APIError(lastError?.message || 'Request failed', 500, {
        message: lastError?.message || 'Unknown Error',
        raw: lastError
    });
  }

  public get<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body: any, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const base = this.baseUrl ? (this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`) : '';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const fullUrl = new URL(base + cleanPath);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fullUrl.searchParams.append(key, String(value));
        }
      });
    }
    return fullUrl.toString();
  }
}
