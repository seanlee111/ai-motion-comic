
import { Asset, StoryboardFrame } from "@/types";

export interface PromptOptions {
    script: string;
    actionNotes?: string;
    scene?: Asset;
    characters?: Asset[];
    timeContext?: string;
    style?: string;
    modelId?: string;
}

export class PromptService {
    static build(options: PromptOptions): string {
        const parts: string[] = [];

        // 1. Scene
        if (options.scene) {
            const sceneDesc = options.scene.description ? `, ${options.scene.description}` : "";
            parts.push(`Scene: ${options.scene.name}${sceneDesc}`);
        }

        // 2. Characters
        if (options.characters && options.characters.length > 0) {
            const charParts = options.characters.map(char => {
                if (!char) return "";
                const charDesc = char.description ? ` (${char.description})` : "";
                return `${char.name}${charDesc}`;
            }).filter(Boolean);
            if (charParts.length > 0) parts.push(`Characters: ${charParts.join(", ")}`);
        }

        // 3. Action & Context
        parts.push(`Action: ${options.script}`);
        if (options.actionNotes) parts.push(options.actionNotes);
        if (options.timeContext) parts.push(options.timeContext);

        // 4. Style & Quality (Could be model specific)
        const defaultStyle = "Masterpiece, cinematic lighting, 8k, highly detailed";
        parts.push(options.style || defaultStyle);

        return parts.join(". ");
    }

    static buildFromFrame(frame: StoryboardFrame, type: "start" | "end", assets: Asset[]): string {
        const script = type === 'start' ? (frame.startScript ?? frame.storyScript) : (frame.endScript ?? frame.storyScript);
        const actionNotes = type === 'start' ? (frame.startActionNotes ?? frame.actionNotes) : (frame.endActionNotes ?? frame.actionNotes);
        const characterIds = type === 'start' ? (frame.startCharacterIds ?? frame.characterIds) : (frame.endCharacterIds ?? frame.characterIds);
        const sceneId = type === 'start' ? (frame.startSceneId ?? frame.sceneId) : (frame.endSceneId ?? frame.sceneId);

        const characters = (characterIds || []).map(id => assets.find(a => a.id === id)).filter(Boolean) as Asset[];
        const scene = assets.find(a => a.id === sceneId);
        
        const timeContext = type === "start" ? "Opening shot, start of action" : "Closing shot, end of action";

        return this.build({
            script: script || "",
            actionNotes,
            scene,
            characters,
            timeContext
        });
    }
}
