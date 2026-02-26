import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { images, description: userDescription, assetType } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const arkKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
    const falKey = process.env.FAL_KEY;

    if (!arkKey || !falKey) {
      return NextResponse.json({ error: "Server missing API Keys (DOUBAO_API_KEY or FAL_KEY)" }, { status: 500 });
    }

    // --- Step 1: Analyze existing views using Doubao Vision ---
    const analysisEndpoint = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    
    const analysisContent: any[] = [
      { 
        type: "text", 
        text: `Analyze these images of a ${assetType === 'character' ? 'character' : 'scene'}. 
        1. Provide a detailed visual description (appearance, clothing, style, colors).
        2. Identify which views are present from this list: "Front", "Side", "Back", "Three-Quarter", "Close-up".
        
        Return ONLY a JSON object with this structure:
        {
          "description": "detailed description string",
          "presentViews": ["Front", "Back"]
        }` 
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

    // Process images for Analysis (Doubao needs Base64 to avoid timeout)
    const processedImages: string[] = [];
    for (const img of images.slice(0, 5)) {
        if (typeof img === 'string' && img.startsWith('http')) {
            try {
                const base64 = await urlToBase64(img);
                processedImages.push(base64);
            } catch (e) {
                console.warn(`Skipping image due to fetch error: ${img}`);
            }
        } else {
            processedImages.push(img);
        }
    }

    if (processedImages.length === 0) {
         return NextResponse.json({ error: "No valid images could be processed" }, { status: 400 });
    }

    processedImages.forEach((img) => {
        analysisContent.push({
            type: "image_url",
            image_url: { url: img }
        });
    });

    const analysisRes = await fetch(analysisEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${arkKey}`
      },
      body: JSON.stringify({
        model: "doubao-seed-2-0-lite-260215",
        messages: [{ role: "user", content: analysisContent }],
        response_format: { type: "json_object" } // Force JSON if supported, otherwise rely on prompt
      })
    });

    if (!analysisRes.ok) {
        throw new Error(`Analysis API Error: ${analysisRes.status}`);
    }

    const analysisData = await analysisRes.json();
    let analysisResult;
    try {
        const content = analysisData.choices?.[0]?.message?.content;
        // Clean markdown code blocks if present
        const jsonStr = content.replace(/```json\n?|\n?```/g, "");
        analysisResult = JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse analysis JSON", e);
        // Fallback
        analysisResult = { description: userDescription || "A character", presentViews: [] };
    }

    const { description, presentViews } = analysisResult;
    const finalDescription = userDescription || description;

    // --- Step 2: Determine Missing Views ---
    const allViews = ["Front", "Side", "Back", "Three-Quarter", "Close-up"];
    // Normalize present views to match casing
    const normalizedPresent = (presentViews || []).map((v: string) => v.toLowerCase());
    
    const missingViews = allViews.filter(v => !normalizedPresent.includes(v.toLowerCase()));
    
    // Limit total resulting images to 5 (Existing + New <= 5)
    const slotsAvailable = 5 - images.length;
    const viewsToGenerate = missingViews.slice(0, slotsAvailable);

    if (viewsToGenerate.length === 0) {
        return NextResponse.json({ newImages: [], message: "No new views needed or slots full." });
    }

    // --- Step 3: Generate Missing Views using Jimeng AI ---
    const referenceImage = images[0];
    const generateEndpoint = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
    
    // Ark requires Base64 for image_urls if not using OSS
    const getBase64ForGen = async (img: string) => {
        if (img.startsWith('data:')) return img;
        return await urlToBase64(img);
    };

    const refBase64 = await getBase64ForGen(referenceImage);
    const generatedUrls: string[] = [];

    // Use environment variable for model endpoint ID, or fallback
    const modelEndpointId = process.env.JIMENG_ENDPOINT_ID || "ep-20250214152358-q42t7";

    // Run sequentially
    for (const view of viewsToGenerate) {
        try {
            // Prompt engineered as requested: "参考该图片，补充完整五视图的意思" + specific view + description
            const prompt = `参考该图片，补充完整五视图的意思。绘制该角色的 ${view} 视图 (View)。\n${finalDescription}`;
            
            const payload = {
                model: modelEndpointId,
                prompt: prompt,
                image_urls: [refBase64],
                strength: 0.75, // Balance
                scale: 3.5,
                height: 1024,
                width: 1024
            };

            const genRes = await fetch(generateEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${arkKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!genRes.ok) {
                const errText = await genRes.text();
                console.error(`Jimeng Generation failed for ${view}: ${errText}`);
                continue;
            }

            const genData = await genRes.json();
            // Ark returns images directly in `data` array usually
            // Structure: { data: [ { url: "..." } ] }
            
            if (genData.data && genData.data.length > 0 && genData.data[0].url) {
                generatedUrls.push(genData.data[0].url);
            }

        } catch (e) {
            console.error(`Failed to generate view ${view}`, e);
        }
    }
    
    // ...


    return NextResponse.json({ 
        newImages: generatedUrls,
        analyzedDescription: description,
        addedViews: viewsToGenerate
    });

  } catch (error: any) {
    console.error("Smart Draw Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to complete views" },
      { status: 500 }
    );
  }
}
