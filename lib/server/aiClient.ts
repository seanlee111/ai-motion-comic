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
}

export const aiClient = new AIClient();
