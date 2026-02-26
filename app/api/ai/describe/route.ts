import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json(); // Expecting array of base64 or urls

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing DOUBAO_API_KEY" }, { status: 500 });
    }

    // Construct messages for Vision API
    const messages = [
        {
            role: "user",
            content: [
                ...images.slice(0, 5).map((img: string) => ({
                    type: "image_url",
                    image_url: {
                        url: img
                    }
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
      model: "ep-20260226195828-rs455", // Updated model endpoint
      messages: messages,
      stream: false
    };

    // Call Volcengine Ark API (Standard OpenAI-compatible endpoint for Ark)
    const endpoint = "https://ark-cn-beijing.bytedance.net/api/v3/chat/completions";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Doubao API Error:", errText);
      throw new Error(`Doubao API Error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const description = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ description });

  } catch (error: any) {
    console.error("Describe API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate description" },
      { status: 500 }
    );
  }
}
