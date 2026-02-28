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
    async parseScript(script: string): Promise<any> {
        if (!this.arkKey) throw new Error("Server missing ARK_API_KEY");

        const messages = [
            {
                role: "system",
                content: `You are an expert storyboard artist and visual storyteller.
Your task is to transform a raw story idea into a cinematic, visually rich storyboard script optimized for AI image generation.

**Goal:** Create a sequence of 4-8 distinct scenes that tell a coherent story with a clear visual progression.

**Format Requirements:**
Return a JSON object with a key "scenes" containing an array of objects.
Each object must have:
- "id": (string) Unique ID like "scene_1"
- "location": (string) Scene header (e.g. INT. SPACE STATION - NIGHT)
- "description": (string) Detailed visual description
- "characters": (array of strings) Character names present
- "shots": (array) Breakdown of shots within the scene, where each shot has:
    - "id": (string) "shot_1"
    - "description": (string) Visual description of the shot action
    - "camera": (string) Camera angle/movement
    - "dialogue": (string) Optional dialogue line
    - "character": (string) Optional character focus

**Constraints:**
- Ensure smooth visual transitions between scenes.
- Keep the descriptions vivid but concise enough for image generation prompts.
- Return ONLY valid JSON.`
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

        return this.processResponse(await res.json());
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
        try {
            const jsonStr = content.replace(/```json\n?|\n?```/g, "");
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse script JSON", content);
            throw new Error("Failed to parse script JSON response");
        }
    }
}

export const aiClient = new AIClient();
