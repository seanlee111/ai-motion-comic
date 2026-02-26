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

    images.slice(0, 5).forEach((img: string) => {
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

    // --- Step 3: Generate Missing Views using Fal Flux ---
    // We use the first image as the reference for consistency
    const referenceImage = images[0];
    const generateEndpoint = "https://queue.fal.run/fal-ai/flux-general/image-to-image";

    const generatedUrls: string[] = [];

    // Run sequentially to avoid rate limits or manage flow better, or parallel
    await Promise.all(viewsToGenerate.map(async (view) => {
        try {
            const prompt = `${finalDescription}. View from ${view} angle. White background, character sheet style, consistent character design. Masterpiece, best quality.`;
            
            const payload = {
                prompt: prompt,
                image_url: referenceImage,
                strength: 0.75, // Good balance for consistency vs angle change
                image_size: "portrait_4_3", // Standard for character cards
                num_inference_steps: 28,
                guidance_scale: 3.5,
                enable_safety_checker: false
            };

            const genRes = await fetch(generateEndpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Key ${falKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!genRes.ok) throw new Error(`Generation failed for ${view}`);

            const genData = await genRes.json();
            // Poll for result if queued
            let imageUrl = "";
            
            if (genData.status === "COMPLETED" && genData.images?.[0]?.url) {
                imageUrl = genData.images[0].url;
            } else if (genData.status_url) {
                // Simple poll
                let attempts = 0;
                while (attempts < 20) {
                    await new Promise(r => setTimeout(r, 1000));
                    const checkRes = await fetch(genData.status_url, {
                        headers: { "Authorization": `Key ${falKey}` }
                    });
                    const checkData = await checkRes.json();
                    if (checkData.status === "COMPLETED") {
                        // Sometimes images are in checkData, sometimes we need response_url
                        if (checkData.images?.[0]?.url) {
                            imageUrl = checkData.images[0].url;
                        } else if (checkData.response_url) {
                             const finalRes = await fetch(checkData.response_url, {
                                 headers: { "Authorization": `Key ${falKey}` }
                             });
                             const finalData = await finalRes.json();
                             imageUrl = finalData.images?.[0]?.url;
                        }
                        break;
                    }
                    if (checkData.status === "FAILED") break;
                    attempts++;
                }
            }

            if (imageUrl) {
                generatedUrls.push(imageUrl);
            }

        } catch (e) {
            console.error(`Failed to generate view ${view}`, e);
        }
    }));

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
