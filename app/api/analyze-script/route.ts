import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();
    const apiKey = req.headers.get("x-llm-key");

    if (!script) {
      return NextResponse.json(
        { error: "Script content is required" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "LLM API Key is missing" },
        { status: 401 }
      );
    }

    // Prepare prompt
    const systemPrompt = `You are a professional storyboard artist and director. 
    Analyze the user's story script and break it down into a sequence of shots (storyboard frames).
    
    Return a JSON object with a key "frames" containing an array of objects. 
    Each object must have:
    - "storyScript": (string) A concise description of the main action.
    - "actionNotes": (string) Camera movement (Pan, Tilt, Zoom) and detailed acting instructions.
    - "duration": (number) Estimated duration in seconds (usually 2-5s).
    - "characters": (array of strings) Names of characters in this shot.
    - "scene": (string) Brief scene setting description.
    
    Example Output:
    {
      "frames": [
        {
          "storyScript": "A cyberpunk detective walks down a rainy neon street.",
          "actionNotes": "Wide shot, camera tracks backward as detective walks forward. Rain is heavy.",
          "duration": 4,
          "characters": ["Detective"],
          "scene": "Neon Street"
        }
      ]
    }`;

    // Call OpenAI Compatible API (e.g. Minimax, DeepSeek, OpenAI)
    // Defaulting to OpenAI standard endpoint for now, but user can point to others if we allowed base_url config.
    // For now we assume standard OpenAI structure.
    
    // NOTE: If using Minimax, the URL might be different (https://api.minimax.chat/v1/...)
    // Since we don't have a base_url setting yet, we'll try a generic fetch that works for OpenAI.
    // If the user uses Minimax, they might need to proxy or we hardcode Minimax if they selected it.
    // Given the requirements, I'll use a standard OpenAI completion call which is widely compatible.
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Or user preferred model if we added that setting
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: script }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
        // Fallback or Error
        // If 401, it means key is invalid for OpenAI. 
        // We could try Minimax if the key format looks like Minimax? 
        // For this MVP, let's just return the error.
        const err = await response.text();
        return NextResponse.json({ error: `LLM API Error: ${err}` }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from content (it might be wrapped in markdown code blocks)
    let jsonStr = content;
    if (content.includes("```json")) {
        jsonStr = content.split("```json")[1].split("```")[0];
    } else if (content.includes("```")) {
        jsonStr = content.split("```")[1].split("```")[0];
    }

    const parsed = JSON.parse(jsonStr.trim());
    
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Script Analysis Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
