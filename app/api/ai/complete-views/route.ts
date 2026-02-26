import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { references, missingViews, description: userDescription, assetType } = await req.json();

    if (!references || Object.keys(references).length === 0) {
      return NextResponse.json({ error: "No reference images provided" }, { status: 400 });
    }

    const arkKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
    
    if (!arkKey) {
      return NextResponse.json({ error: "Server missing ARK_API_KEY" }, { status: 500 });
    }

    if (!missingViews || !Array.isArray(missingViews) || missingViews.length === 0) {
         return NextResponse.json({ generatedViews: {}, message: "No missing views requested." });
    }

    // --- Step 3: Generate Missing Views using Jimeng AI (Ark) ---
    // Using the same configuration as start/end frames (Jimeng 4.5 via Ark)
    const generateEndpoint = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
    
    // Ark requires Base64 for image_urls if not using OSS
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
    
    const getBase64ForGen = async (img: string) => {
        if (img.startsWith('data:')) return img;
        return await urlToBase64(img);
    };

    // Prepare references: Jimeng I2I supports one reference image as base (usually).
    // If we want consistency, we should use the "Front" view if available, or the first available.
    // The `references` object keys are view names (Front, Side, etc).
    
    let primaryRefUrl = references["Front"];
    if (!primaryRefUrl) {
        // Fallback to first available
        primaryRefUrl = Object.values(references)[0] as string;
    }
    
    const referenceBase64s = [await getBase64ForGen(primaryRefUrl)]; // Only use one primary reference for I2I base

    const generatedViews: Record<string, string> = {};

    // Use the exact model ID from lib/ai-providers/jimeng.ts
    const modelId = "doubao-seedream-4-5-251128";

    // Run sequentially
    let lastError = "";
    
    // View name mapping to Chinese
    const VIEW_MAP: Record<string, string> = {
        "Front": "正视图 (Front View)",
        "Side": "侧视图 (Side View)",
        "Back": "后视图 (Back View)",
        "Three-Quarter": "四分之三侧视图 (3/4 View)",
        "Close-up": "特写视图 (Close-up)"
    };

    for (const view of missingViews) {
        try {
            const viewNameCN = VIEW_MAP[view] || view;
            
            // Prompt engineered: NO userDescription used to avoid conflict.
            // Strictly follow the reference image.
            const prompt = `参考该图片。严格保持角色形象、面部、发型、服装、配饰、体型与原图完全一致。生成该角色的${viewNameCN}。单人，白色背景，无多余人物。仅改变视角，不做其他修改。`;
            
            const payload = {
                model: modelId,
                prompt: prompt,
                width: 1024,
                height: 1024, // Square for character views
                return_url: true,
                stream: false,
                watermark: false,
                image_urls: referenceBase64s, 
                // Strength adjustment:
                // If the user says "completely different", maybe strength 0.65 is still too high (too much change allowed).
                // Or maybe too low (too much original structure kept).
                // For changing view from Front to Side, we need structure change. 0.65 is standard.
                // But Prompt is key. Removed userDescription.
                strength: 0.65, 
                scale: 3.5,     
                steps: 25,
                sequential_image_generation: "auto",
                sequential_image_generation_options: { max_images: 1 }
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
                lastError = errText;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error?.message) {
                        lastError = errJson.error.message;
                        console.error(`Jimeng Error Message: ${errJson.error.message}`);
                    }
                } catch {}
                continue;
            }

            const genData = await genRes.json();
            
            if (genData.data && genData.data.length > 0 && genData.data[0].url) {
                generatedViews[view] = genData.data[0].url;
            }

        } catch (e: any) {
            console.error(`Failed to generate view ${view}`, e);
            lastError = e.message;
        }
    }
    
    if (Object.keys(generatedViews).length === 0 && lastError) {
         return NextResponse.json({ error: `Failed to generate views: ${lastError}` }, { status: 500 });
    }

    return NextResponse.json({ 
        generatedViews,
        message: "Success"
    });

  } catch (error: any) {
    console.error("Smart Draw Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to complete views" },
      { status: 500 }
    );
  }
}
