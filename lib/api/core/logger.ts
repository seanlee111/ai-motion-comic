import { v4 as uuidv4 } from 'uuid';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private debugEnabled: boolean;

  constructor() {
    this.debugEnabled = process.env.NEXT_PUBLIC_API_DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }

  private format(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  public debug(message: string, meta?: any) {
    if (this.debugEnabled) {
      console.debug(this.format('DEBUG', message, meta));
    }
  }

  public info(message: string, meta?: any) {
    console.log(this.format('INFO', message, meta));
  }

  public warn(message: string, meta?: any) {
    console.warn(this.format('WARN', message, meta));
  }

  public error(message: string, error?: any, meta?: any) {
    const errorMeta = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...meta
    } : { error, ...meta };
    
    console.error(this.format('ERROR', message, errorMeta));
  }

  public request(reqId: string, method: string, url: string, headers?: any, body?: any) {
    if (this.debugEnabled) {
      this.debug(`API Request [${reqId}]`, {
        method,
        url,
        headers: this.maskHeaders(headers),
        body: this.maskBody(body)
      });
    }
  }

  public response(reqId: string, status: number, body?: any, duration?: number) {
    if (this.debugEnabled) {
      this.debug(`API Response [${reqId}]`, {
        status,
        duration: duration ? `${duration}ms` : undefined,
        body: this.maskBody(body)
      });
    }
  }

  private maskHeaders(headers: any): any {
    if (!headers) return headers;
    const masked = { ...headers };
    ['authorization', 'cookie', 'x-api-key'].forEach(key => {
      // Case insensitive check
      const actualKey = Object.keys(masked).find(k => k.toLowerCase() === key);
      if (actualKey && typeof masked[actualKey] === 'string') {
        masked[actualKey] = this.maskString(masked[actualKey]);
      }
    });
    return masked;
  }

  private maskBody(body: any): any {
    if (!body) return body;
    // Simple deep copy to avoid mutation if body is object
    try {
        const masked = JSON.parse(JSON.stringify(body));
        // Add specific field masking logic if needed (e.g. base64 images)
        return masked;
    } catch {
        return body;
    }
  }

  private maskString(str: string): string {
    if (str.length <= 8) return '****';
    return `${str.slice(0, 4)}****${str.slice(-4)}`;
  }
}

export const logger = new Logger();
