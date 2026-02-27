'use server';

import { aiClient } from "@/lib/server/aiClient";

export async function parseScriptAction(script: string) {
    if (!script || script.length < 10) {
        return { success: false, error: "Script too short" };
    }

    try {
        const parsedData = await aiClient.parseScript(script);
        return { success: true, data: parsedData };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}