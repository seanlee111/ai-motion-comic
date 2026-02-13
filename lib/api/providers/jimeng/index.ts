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
    const { prompt, aspect_ratio, model } = req;
    
    // Map Aspect Ratio
    let width = 2048;
    let height = 2048;
    if (aspect_ratio === "16:9") { width = 2560; height = 1440; }
    if (aspect_ratio === "9:16") { width = 1440; height = 2560; }

    let req_key = "jimeng_t2i_v40";
    if (model === 'jimeng-v4.5') {
        req_key = "doubao-seedream-4-5-251128";
    }

    const payload: any = {
        req_key: req_key,
        prompt: prompt,
        width,
        height,
        scale: 0.5,
        force_single: true,
        logo_info: { add_logo: false }
    };

    // 4.5 supports sequential generation, let's keep it simple for now
    // If it's 4.5, we might need slightly different params based on SDK example?
    // SDK Example: 
    // model="doubao-seedream-4-5-251128",
    // prompt="...",
    // sequential_image_generation="disabled",
    // response_format="url",
    // size="2K",
    // stream=False,
    // watermark=True
    
    // BUT the underlying API (CVAsync) usually wraps these model-specific params in `req_json` or similar?
    // Wait, the SDK example uses `client.images.generate`. This is the NEW "Ark" style API (OpenAI compatible-ish).
    // The current implementation uses the OLD "Visual" (CVAsync) API.
    // 
    // Jimeng 4.5 via Volcengine usually requires the new Ark Runtime or specific endpoint.
    // However, if we stick to the current signed request method, we need to know if 4.5 is available via the old `req_key` method.
    // 
    // If the user provided an SDK example using `volcenginesdkarkruntime`, that implies we should switch to the Ark API endpoint
    // OR use the compatible HTTP endpoint: https://ark.cn-beijing.volces.com/api/v3/images/generations
    // 
    // Let's assume for now we need to use the NEW Ark API structure for 4.5, which is much simpler (OpenAI-like).
    // AND we should probably migrate v4 to it if possible, but let's just branch for now.
    
    if (model === 'jimeng-v4.5') {
        return this.generateArk(req);
    }

    // ... (Existing v4 logic below) ...
    
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

  // New method for Ark API (Jimeng 4.5)
  private async generateArk(req: GenerateRequest): Promise<GenerateResult> {
      const { prompt, imageUrl } = req;
      
      // Check for ARK_API_KEY
      if (!process.env.ARK_API_KEY) {
          throw new APIError('Missing ARK_API_KEY for Jimeng 4.5', 500);
      }

      const endpoint = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
      
      // Jimeng 4.5 Ark Implementation
      // Doc: https://ark.cn-beijing.volces.com/api/v3
      
      // Determine image size based on aspect ratio
      // Jimeng 4.5 usually takes specific strings like "2K", "4K" or specific resolutions.
      // Based on provided code snippet, it uses "2K". 
      // Let's stick to "2K" as default or map it?
      let size = "2K";
      // If we want to support ratio, we might need to check if 4.5 supports `width`/`height` or just `size`.
      // The provided snippet uses `size="2K"`.
      
      const payload: any = {
          model: "doubao-seedream-4-5-251128",
          prompt: prompt,
          response_format: "url",
          size: size, 
          stream: false, // Use false for simpler handling in our backend
          watermark: false
      };

      // Handle Reference Images (Multi-Ref)
      // Requirement: "参考多张图" (Reference multiple images)
      // The snippet provided:
      // image=["url1", "url2"],
      // sequential_image_generation="auto",
      // sequential_image_generation_options=...
      
      // Our `req` currently has `imageUrl` (string). 
      // If we want to support multiple images, we need `req` to support it or just use `imageUrl` as single list item.
      // And we might need to fetch `scene` image and `character` image(s) from somewhere if not passed.
      // Currently `StoryboardFrame.tsx` passes `imageUrl` as a single string.
      // BUT `req.providerData` or similar might carry extra info? 
      // Or we can hack `imageUrl` to be comma separated if we want?
      // Better: Use `req.imageUrl` as the main reference. If we want multi-ref, we need to update the frontend/request type.
      // For now, let's support passing `imageUrl` as a single item list if it exists.
      
      // WAIT: The prompt says "选择多个模型，在一个分镜里面选择参考的人物和环境". 
      // So the user wants to pass BOTH Character image AND Scene image.
      // `StoryboardFrame.tsx` logic currently picks ONE: `imageUrl = selectedScene.imageUrl || selectedCharacters[0].imageUrl`.
      // We should probably update the request interface to support `imageUrls: string[]` or similar.
      // However, to avoid breaking everything, let's assume `imageUrl` might be one.
      
      // TODO: Ideally refactor `GenerateRequest` to have `referenceImages: string[]`.
      // For now, if `imageUrl` is present, we wrap it in list.
      
      if (imageUrl) {
          payload.image = [imageUrl];
          // If we had more, we'd add them here.
      }
      
      // Enable sequential generation as per snippet (optional but cool feature)
      // payload.sequential_image_generation = "auto"; 
      // payload.sequential_image_generation_options = { max_images: 3 }; 
      // But for standard "Generate Frame", we usually want 1 image.
      // The user snippet generates 3 images.
      // Our interface returns `images: string[]`. We can return multiple!
      
      // Let's request 2 images by default for Jimeng 4.5 to give user choice?
      // Or stick to 1 to save credits/time.
      // User said "用户可以看到多个模型生产的多组图，用户可以进行挑选".
      // This implies we *can* return multiple.
      
      // Let's try to generate 2 images if it's 4.5
      payload.sequential_image_generation = "auto";
      payload.sequential_image_generation_options = { max_images: 2 };

      const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ARK_API_KEY}`
          },
          body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
          const err = await response.text();
          throw new APIError(`Jimeng 4.5 Failed: ${err}`, response.status);
      }
      
      const data = await response.json();
      
      // Ark Response Format
      // { data: [{ url: "..." }, { url: "..." }] }
      
      if (data.data && data.data.length > 0) {
          return {
              taskId: data.id || 'sync-ark', 
              status: 'COMPLETED',
              images: data.data.map((d: any) => d.url)
          };
      }
      
      throw new APIError('Jimeng 4.5: No images returned', 500);
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
