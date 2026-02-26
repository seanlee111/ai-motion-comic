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
    const content: any[] = [
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
    ];

    // Helper to fetch URL and convert to base64
    const urlToBase64 = async (url: string): Promise<string> => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get("content-type") || "image/jpeg";
            return `data:${contentType};base64,${buffer.toString("base64")}`;
        } catch (error) {
            console.error("Error converting URL to base64:", error);
            throw error;
        }
    };

    // Add up to 5 images, converting URLs to Base64 if needed
    for (const img of images.slice(0, 5)) {
        let finalImg = img;
        if (typeof img === 'string' && img.startsWith('http')) {
            try {
                finalImg = await urlToBase64(img);
            } catch (e) {
                console.warn(`Skipping image due to fetch error: ${img}`);
                continue;
            }
        }

        content.push({
            type: "image_url",
            image_url: {
                url: finalImg // Now guaranteed to be base64 data URI if it was fetched successfully
            }
        });
    }

    const payload = {
      model: "doubao-seed-2-0-lite-260215", // User specified model endpoint
      messages: [
        {
          role: "user",
          content: content
        }
      ],
      stream: false
    };

    // Call Volcengine Ark API (Standard OpenAI-compatible endpoint for Ark)
    const endpoint = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

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
