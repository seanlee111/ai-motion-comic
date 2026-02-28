import 'server-only';

export const runtime = "nodejs";

const ARK_ENDPOINT_CHAT = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const ARK_ENDPOINT_IMAGE = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

// Helper to validate environment
function getEnv(key: string): string {
    const val = process.env[key];
    if (!val) {
        throw new Error(`Missing server-side environment variable: ${key}`);
    }
    return val;
}

export class AIClient {
    private arkKey: string;

    constructor() {
        this.arkKey = process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || "";
        if (!this.arkKey) {
            console.warn("AIClient: Missing ARK_API_KEY");
        }
    }

    async generateDescription(images: string[]): Promise<string> {
        if (!this.arkKey) throw new Error("Server missing ARK_API_KEY");

        const messages = [
            {
                role: "user",
                content: [
                    ...images.slice(0, 5).map((img) => ({
                        type: "image_url",
                        image_url: { url: img }
                    })),
                    {
                        type: "text",
                        text: `请作为一名专业的 AI 绘画提示词专家，为图片中的角色生成简短、准确、易懂的中文描述。

要求：
1. 风格开门见山：例如“一个3D渲染的卡通风格女性角色”。
2. 核心特征罗列：用一句话概括发型、服装、配饰等，避免使用过多的修饰词（如“质感细腻”、“软萌清新”等）。
3. 结构清晰：采用“风格+角色+特征+视角”的逻辑。
4. 语言简洁：字数控制在 100 字左右，不要写成散文，要像一份清单。

参考格式：
“一个3D渲染的卡通风格女性角色，拥有棕色长卷发并用白色大蝴蝶结固定，身穿粉色V领针织衫、白色百褶短裙、白色长袜和白色厚底凉鞋，内搭白色衬衫并系有黑白图案领带，左手腕佩戴金色手链，呈现正面视角。”`
                    }
                ]
            }
        ];

        const payload = {
            model: "doubao-seed-2-0-lite-260215",
            messages: messages,
            stream: false
        };

        const res = await fetch(ARK_ENDPOINT_CHAT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.arkKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Doubao API Error: ${res.status} ${errText}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
    }

    async completeViews(
        referenceBase64s: string[], 
        viewName: string, 
        description: string
    ): Promise<string | null> {
        if (!this.arkKey) throw new Error("Server missing ARK_API_KEY");

        const VIEW_MAP: Record<string, string> = {
            "Front": "正视图 (Front View)",
            "Side": "侧视图 (Side View)",
            "Back": "后视图 (Back View)",
            "Three-Quarter": "四分之三侧视图 (3/4 View)",
            "Close-up": "特写视图 (Close-up)"
        };

        const viewNameCN = VIEW_MAP[viewName] || viewName;
        const modelId = "doubao-seedream-4-5-251128";

        const prompt = `(角色设定图). 请严格参考原图的角色形象，保持面部、发型、服装、配饰、体型与原图完全一致。生成该角色的${viewNameCN}。单人，白色背景，无多余人物。仅改变视角，不做其他修改。`;

        const payload = {
            model: modelId,
            prompt: prompt,
            width: 1024,
            height: 1024,
            return_url: true,
            stream: false,
            watermark: false,
            image_urls: referenceBase64s,
            strength: 0.65,
            scale: 3.5,
            steps: 25,
            sequential_image_generation: "auto",
            sequential_image_generation_options: { max_images: 1 }
        };

        const res = await fetch(ARK_ENDPOINT_IMAGE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.arkKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Jimeng Generation failed for ${viewName}: ${errText}`);
        }

        const data = await res.json();
        if (data.data && data.data.length > 0 && data.data[0].url) {
            return data.data[0].url;
        }
        return null;
    }
    async parseScript(script: string, systemPrompt?: string): Promise<{ data: any; requestPayload: any; responseBody: any }> {
        if (!this.arkKey) throw new Error("Server missing ARK_API_KEY");

        const messages = [
            {
                role: "system",
                content: systemPrompt || `你是一位专业的分镜画师和视觉叙事专家。
你的任务是将一个原始的故事创意转化为适合AI图像生成的、具有电影感的详细分镜脚本。

**目标：** 创建一个包含4-8个不同场景的序列，讲述一个连贯的故事，并具有清晰的视觉推进。

**格式要求：**
返回一个 JSON 对象，其中包含一个名为 "scenes" 的对象数组。
每个对象必须包含：
- "id": (string) 唯一ID，如 "scene_1"
- "location": (string) 场景标题（例如：内景 空间站 - 夜）
- "description": (string) 详细的视觉描述
- "characters": (array of strings) 出现的角色名称
- "shots": (array) 场景内的镜头细分，每个镜头包含：
    - "id": (string) "shot_1"
    - "description": (string) 镜头动作的视觉描述
    - "camera": (string) 运镜角度/方式
    - "dialogue": (string) 可选的对白
    - "character": (string) 可选的焦点角色

**约束：**
- **必须使用中文**进行所有描述。
- 确保场景之间的视觉过渡流畅。
- 描述要生动，但要足够简洁，以便作为图像生成的提示词。
- 仅返回有效的 JSON。`
            },
            {
                role: "user",
                content: script
            }
        ];

        const payload = {
            model: "deepseek-chat", // DeepSeek official model ID
            messages: messages,
            stream: false,
            temperature: 0.7
        };

        const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getEnv("DEEPSEEK_API_KEY")}` // Using DEEPSEEK_API_KEY as requested
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Script Parsing API Error: ${res.status} ${errText}`);
        }

        const responseData = await res.json();
        return {
            data: this.processResponse(responseData),
            requestPayload: payload,
            responseBody: responseData
        };
    }

    // Helper to validate Base64 image format
    private validateBase64Image(base64: string): boolean {
        // Must start with data:image/[format];base64,
        // Supported formats: jpg, jpeg, png, webp, bmp
        const pattern = /^data:image\/(jpeg|jpg|png|webp|bmp);base64,/;
        return pattern.test(base64);
    }

    async generateVideo(
        startImageBase64: string, 
        endImageBase64: string, 
        prompt: string
    ): Promise<{ taskId: string; requestPayload: any; responseBody: any }> {
        if (!this.arkKey) throw new Error("Server missing ARK_API_KEY");

        // Validate image formats
        if (!this.validateBase64Image(startImageBase64)) {
            throw new Error("Invalid start image format. Must be data:image/[type];base64,... (jpeg/jpg/png/webp/bmp)");
        }
        if (!this.validateBase64Image(endImageBase64)) {
            throw new Error("Invalid end image format. Must be data:image/[type];base64,... (jpeg/jpg/png/webp/bmp)");
        }

        const modelId = "doubao-seedance-1-5-pro-251215";
        // Correct endpoint based on SDK docs (plural: contents/generations/tasks)
        const videoEndpoint = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

        const payload = {
            model: modelId,
            content: [
                {
                    type: "text",
                    text: prompt
                },
                {
                    type: "image_url",
                    image_url: {
                        url: startImageBase64
                    },
                    role: "first_frame"
                },
                {
                    type: "image_url",
                    image_url: {
                        url: endImageBase64
                    },
                    role: "last_frame"
                }
            ],
            generate_audio: true,
            duration: 5,
            ratio: "adaptive",
            watermark: false
        };

        console.log("Sending video generation request:", JSON.stringify(payload, null, 2));

        const res = await fetch(videoEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.arkKey}`
            },
            body: JSON.stringify(payload)
        });

        const requestId = res.headers.get("x-tt-logid") || "unknown";
        let responseBody;

        if (!res.ok) {
            const errText = await res.text();
            let errDetail = errText;
            try {
                const errJson = JSON.parse(errText);
                errDetail = JSON.stringify(errJson, null, 2);
                responseBody = errJson;
            } catch (e) {
                responseBody = { error: errText };
            }
            
            console.error(`Video Generation Failed [${requestId}]: ${res.status}`, errDetail);
            throw new Error(`API Error ${res.status} [ReqID: ${requestId}]: ${errDetail}`);
        }

        const data = await res.json();
        responseBody = data;
        console.log("Video generation task created:", data);

        // The API returns { id: "task_id" }
        if (data.id) {
            return { taskId: data.id, requestPayload: payload, responseBody: data }; // Return taskId immediately
        }
        
        throw new Error("No task ID returned from video generation API");
    }

    async checkVideoTask(taskId: string): Promise<{ status: string; videoUrl?: string; error?: string; responseBody?: any }> {
        if (!this.arkKey) throw new Error("Server missing ARK_API_KEY");
        
        const statusEndpoint = `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`;
        
        const res = await fetch(statusEndpoint, {
            headers: { "Authorization": `Bearer ${this.arkKey}` }
        });
        
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Polling error: ${res.status} ${errText}`);
        }

        const data = await res.json();
        console.log(`Task ${taskId} status:`, data.status);
        
        if (data.status === "succeeded") {
            return { status: "succeeded", videoUrl: data.content?.video_url, responseBody: data };
        } else if (data.status === "failed" || data.status === "expired" || data.status === "cancelled") {
            return { status: "failed", error: data.error?.message || `Task ${data.status}`, responseBody: data };
        } else {
            return { status: data.status || "running", responseBody: data };
        }
    }

    private processResponse(data: any): any {
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
             throw new Error("Empty response from AI");
        }

        try {
            // 1. Try to extract from markdown code blocks first
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            let jsonStr = jsonMatch ? jsonMatch[1] : content;

            // 2. Locate the JSON object boundaries
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }

            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse script JSON", content);
            // Include content snippet in error message for better debugging
            const snippet = content.length > 200 ? content.substring(0, 200) + "..." : content;
            throw new Error(`Failed to parse script JSON response: ${snippet}`);
        }
    }
}

export const aiClient = new AIClient();
