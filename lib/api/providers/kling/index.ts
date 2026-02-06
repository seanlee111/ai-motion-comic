import { HttpClient } from '../../core/client';
import { APIError, GenerateRequest, GenerateResult } from '../../core/types';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const KlingRequestSchema = z.object({
  model_name: z.string().default('kling-v2'),
  prompt: z.string().min(1),
  aspect_ratio: z.enum(['16:9', '1:1', '9:16', '4:3', '3:4']).optional().default('16:9'),
  n: z.number().int().min(1).max(9).default(1)
});

export class KlingProvider {
  private client: HttpClient;
  private ak: string;
  private sk: string;

  constructor() {
    this.client = new HttpClient('https://api.klingai.com/v1/images/generations', {
      timeout: 30000, // Kling might take longer? Or just for submit? Submit is fast.
      retries: 1
    });

    const ak = process.env.KLING_ACCESS_KEY;
    const sk = process.env.KLING_SECRET_KEY;

    if (!ak || !sk) {
      throw new APIError('Missing Kling Credentials', 500);
    }

    this.ak = ak.trim();
    this.sk = sk.trim();
  }

  private generateToken(): string {
    const payload = {
        iss: this.ak,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1800,
        nbf: Math.floor(Date.now() / 1000) - 5
    };
    return jwt.sign(payload, this.sk, { 
        algorithm: 'HS256', 
        header: { alg: 'HS256', typ: 'JWT', kid: this.ak } 
    });
  }

  public async generate(req: GenerateRequest): Promise<GenerateResult> {
    // Validation
    const payload = KlingRequestSchema.parse({
        model_name: req.model === 'kling-v2' ? 'kling-v2' : 'kling-v1', // Fallback logic
        prompt: req.prompt,
        aspect_ratio: req.aspect_ratio,
        n: req.n
    });

    const token = this.generateToken();

    const response = await this.client.request<any>('', { // Base URL is set in constructor
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (response.code !== 0 || !response.data?.task_id) {
        throw new APIError('Kling Submit Failed', 500, {
            message: response.message || 'Unknown Error',
            raw: response
        });
    }

    return {
        taskId: response.data.task_id,
        status: 'SUBMITTED',
        providerData: { endpoint: 'https://api.klingai.com/v1/images/generations' }
    };
  }

  public async checkStatus(taskId: string): Promise<GenerateResult> {
    const token = this.generateToken();
    const statusUrl = `/${taskId}`; // Relative to base URL

    const response = await this.client.request<any>(statusUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.code !== 0) {
         throw new APIError('Kling Status Failed', 500, {
            message: response.message || 'Unknown Error',
            raw: response
        });
    }

    const taskData = response.data;
    let status: GenerateResult['status'] = 'IN_PROGRESS';
    let images: string[] = [];
    let error: string | undefined;

    if (taskData.task_status === 'succeed') {
        status = 'COMPLETED';
        images = (taskData.task_result?.images || []).map((img: any) => img.url);
    } else if (taskData.task_status === 'failed') {
        status = 'FAILED';
        error = taskData.task_status_msg || "Kling Generation Failed";
    }

    return {
        taskId,
        status,
        images,
        error
    };
  }
}
