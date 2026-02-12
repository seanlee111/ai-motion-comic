import { HttpClient } from '../../core/client';
import { APIError, GenerateRequest, GenerateResult } from '../../core/types';
import aws4 from 'aws4';

export class JimengProvider {
  private client: HttpClient;
  private ak: string;
  private sk: string;

  constructor() {
    this.client = new HttpClient('https://visual.volcengineapi.com', {
      timeout: 5000, // 5s timeout as requested
      retries: 3
    });
    
    const ak = process.env.JIMENG_AK;
    const sk = process.env.JIMENG_SK;
    
    if (!ak || !sk) {
      throw new APIError('Missing Jimeng Credentials', 500);
    }
    
    this.ak = ak.trim();
    this.sk = sk.trim();
  }

  private sign(options: any) {
    return aws4.sign(options, { accessKeyId: this.ak, secretAccessKey: this.sk });
  }

  public async generate(req: GenerateRequest): Promise<GenerateResult> {
    const { prompt, aspect_ratio } = req;
    
    // Map Aspect Ratio
    let width = 2048;
    let height = 2048;
    if (aspect_ratio === "16:9") { width = 2560; height = 1440; }
    if (aspect_ratio === "9:16") { width = 1440; height = 2560; }

    const payload = {
        req_key: "jimeng_t2i_v40",
        prompt: prompt,
        width,
        height,
        scale: 0.5,
        force_single: true,
        logo_info: { add_logo: false }
    };

    // Prepare Signed Request
    const host = 'visual.volcengineapi.com';
    const path = '/';
    const query = 'Action=CVSync2AsyncSubmitTask&Version=2022-08-31';
    
    const requestOptions = {
        host,
        path: `${path}?${query}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Host': host,
        },
        body: JSON.stringify(payload),
        service: 'visual', // Try 'visual' again as 'cv' failed
        region: 'cn-north-1'
    };

    this.sign(requestOptions);

    // Debug Headers
    console.log('Jimeng Signed Headers:', JSON.stringify(requestOptions.headers, null, 2));

    // Use the exact signed path (including query string) for the request
    const response = await this.client.request<any>(requestOptions.path, {
        method: 'POST',
        headers: requestOptions.headers as any,
        body: requestOptions.body
    });

    if (response.code !== 10000 || !response.data?.task_id) {
        throw new APIError('Jimeng Submit Failed', 500, {
            message: response.message || 'Unknown Error',
            raw: response
        });
    }

    return {
        taskId: response.data.task_id,
        status: 'SUBMITTED',
        providerData: { endpoint: `https://${host}` }
    };
  }

  public async checkStatus(taskId: string, endpoint?: string): Promise<GenerateResult> {
    const payload = {
        req_key: "jimeng_t2i_v40",
        task_id: taskId,
        req_json: JSON.stringify({ return_url: true })
    };

    const host = 'visual.volcengineapi.com';
    const path = '/';
    const query = 'Action=CVSync2AsyncGetResult&Version=2022-08-31';
    
    const requestOptions = {
        host,
        path: `${path}?${query}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Host': host,
        },
        body: JSON.stringify(payload),
        service: 'visual', // Try 'visual' again as 'cv' failed
        region: 'cn-north-1'
    };

    this.sign(requestOptions);

    const response = await this.client.request<any>(requestOptions.path, {
        method: 'POST',
        headers: requestOptions.headers as any,
        body: requestOptions.body
    });

    // Map Status
    let status: GenerateResult['status'] = 'IN_PROGRESS';
    let images: string[] = [];
    let error: string | undefined;

    if (response.data?.status === 'done') {
        status = 'COMPLETED';
        images = response.data.image_urls || [];
    } else if (response.data?.status === 'failed' || (response.code !== 10000 && response.code !== 0)) {
        status = 'FAILED';
        error = response.message || "Jimeng Generation Failed";
    }

    return {
        taskId,
        status,
        images,
        error
    };
  }
}
