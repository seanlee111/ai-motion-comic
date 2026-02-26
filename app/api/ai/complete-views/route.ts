import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { references, missingViews, description: userDescription, assetType } = await req.json();

    if (!references || Object.keys(references).length === 0) {
      return NextResponse.json({ error: "No reference images provided" }, { status: 400 });
    }

    const arkKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
    const falKey = process.env.FAL_KEY;

    if (!arkKey || !falKey) {
      return NextResponse.json({ error: "Server missing API Keys (DOUBAO_API_KEY or FAL_KEY)" }, { status: 500 });
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

    // Prepare references: Jimeng supports multiple reference images in `image_urls`.
    // We will use ALL available reference images to improve consistency.
    const referenceUrls = Object.values(references) as string[];
    const referenceBase64s = await Promise.all(referenceUrls.slice(0, 3).map(getBase64ForGen)); // Limit to 3 refs to avoid payload limits

    const generatedViews: Record<string, string> = {};

    // Use the exact model ID from lib/ai-providers/jimeng.ts
    const modelId = "doubao-seedream-4-5-251128";

    // Run sequentially
    let lastError = "";
    
    for (const view of missingViews) {
        try {
            // Prompt engineered for consistency
            // Explicitly mentioning "Character Reference Sheet" and "Consistency"
            const prompt = `(Character Reference Sheet). Keep strict character consistency with the reference images. Same face, same clothes, same body type. Draw the ${view} view of this character.\n${userDescription}`;
            
            // Construct payload matching lib/ai-providers/jimeng.ts generateArk()
            const payload = {
                model: modelId,
                prompt: prompt,
                width: 1024,
                height: 1024, // Square for character views
                return_url: true,
                stream: false,
                watermark: false,
                image_urls: referenceBase64s, // Pass multiple references!
                // image: [refBase64], // Removed
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
