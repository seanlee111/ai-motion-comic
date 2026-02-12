import { HttpClient } from '../../core/client';
import { APIError } from '../../core/types';

export class DeepSeekProvider {
  private client: HttpClient;
  private apiKey: string;

  constructor() {
    this.client = new HttpClient('https://api.deepseek.com', {
      timeout: 60000, // 60s timeout for long script generation
      retries: 2
    });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    // We allow initialization without key if it's just a placeholder, 
    // but generate will fail.
    this.apiKey = apiKey ? apiKey.trim() : '';
  }

  public async generateScript(idea: string): Promise<string> {
    if (!this.apiKey) {
        // Fallback or throw error. For now throw error to prompt user configuration.
        throw new APIError('Missing DeepSeek API Key', 500);
    }

    // Allow overriding system prompt via env var for easy tuning
    const customSystemPrompt = process.env.DEEPSEEK_SYSTEM_PROMPT;
    
    if (customSystemPrompt) {
        console.log('Using custom DeepSeek system prompt from environment variables');
    }

    const defaultSystemPrompt = `You are an expert storyboard artist and visual storyteller.
Your task is to transform a raw story idea into a cinematic, visually rich storyboard script optimized for AI image generation.

**Goal:** Create a sequence of 4-8 distinct scenes that tell a coherent story with a clear visual progression.

**Format Requirements:**
1. **Header:** Start each scene with exactly "[Scene X]" (e.g., [Scene 1]).
2. **Description:** Immediately follow with a detailed visual description in a single paragraph.
3. **Elements:** For each scene, explicitly include:
   - **Subject:** Who or what is the focus?
   - **Action:** What is happening?
   - **Camera:** Camera angle (e.g., Wide shot, Close-up, Low angle) and movement.
   - **Lighting/Atmosphere:** Time of day, weather, lighting style (e.g., Cinematic, Volumetric, Neon).
   - **Style:** Art style or aesthetic (e.g., Cyberpunk, Watercolor, Photorealistic).

**Constraints:**
- Do NOT use dialogue script format (e.g., "Bob: Hello"). If characters speak, describe their expression or action.
- Ensure smooth visual transitions between scenes.
- Keep the descriptions vivid but concise enough for image generation prompts.

**Example Output:**
[Scene 1] A wide establishing shot of a desolate Mars colony at sunset. Red dust swirls around rusted habitat domes. The lighting is long, dramatic shadows with a harsh orange glow. Cinematic sci-fi style, 8k resolution.

[Scene 2] Close-up on a cracked helmet visor lying in the sand. A reflection in the visor shows a mysterious blue light approaching from the distance. High contrast, mystery thriller atmosphere.
`;

    const systemPrompt = customSystemPrompt || defaultSystemPrompt;

    const payload = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Here is the story idea: "${idea}". Please generate the storyboard script.` }
        ],
        temperature: 0.8, // Slightly higher for creativity
        max_tokens: 3000
    };

    const response = await this.client.request<any>('/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
    }

    throw new APIError('DeepSeek Generation Failed', 500, {
        message: 'No content in response',
        raw: response
    });
  }
}
