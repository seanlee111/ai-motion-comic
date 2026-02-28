'use server';

import { aiClient } from "@/lib/server/aiClient";

export async function parseScriptAction(script: string, systemPrompt?: string) {
    if (!script || script.length < 5) { // Relaxed length check
        return { success: false, error: "Script too short" };
    }

    try {
        const result = await aiClient.parseScript(script, systemPrompt);
        return { success: true, data: result.data, requestPayload: result.requestPayload, responseBody: result.responseBody };
    } catch (e: any) {
        return { 
            success: false, 
            error: e.message,
            requestPayload: e.requestPayload,
            responseBody: e.responseBody
        };
    }
}