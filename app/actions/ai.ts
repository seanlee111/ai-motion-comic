'use server';

import { aiClient } from "@/lib/server/aiClient";

// Helper to fetch URL and convert to base64 (Server-side only)
const urlToBase64 = async (url: string): Promise<string> => {
    if (url.startsWith("data:")) return url;
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

export async function generateDescriptionAction(images: string[]) {
    // Process images (convert URL to base64 if needed, or pass as is if URL is public)
    // Actually, Doubao Vision API supports URLs if they are accessible.
    // But previous code converted to Base64 to avoid timeouts. Let's keep that logic if needed.
    // aiClient expects URLs or Base64.
    
    // We'll map them here.
    const processed = await Promise.all(images.map(async (img) => {
        if (img.startsWith('http')) return await urlToBase64(img);
        return img;
    }));

    try {
        const description = await aiClient.generateDescription(processed);
        return { success: true, description };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function completeViewsAction(
    references: Record<string, string>, 
    missingViews: string[], 
    description: string
) {
    try {
        let primaryRefUrl = references["Front"];
        if (!primaryRefUrl) {
            primaryRefUrl = Object.values(references)[0] as string;
        }
        
        // Convert to Base64 for Jimeng
        const base64 = await urlToBase64(primaryRefUrl);
        const generatedViews: Record<string, string> = {};

        // Run sequentially
        for (const view of missingViews) {
            try {
                const url = await aiClient.completeViews([base64], view, description);
                if (url) generatedViews[view] = url;
            } catch (e) {
                console.error(`Failed view ${view}`, e);
            }
        }

        return { success: true, generatedViews };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function generateVideoAction(
    startImageUrl: string, 
    endImageUrl: string, 
    prompt: string
) {
    try {
        const startBase64 = await urlToBase64(startImageUrl);
        const endBase64 = await urlToBase64(endImageUrl);
        
        // Returns taskId now
        const result = await aiClient.generateVideo(startBase64, endBase64, prompt);
        
        if (!result.taskId) throw new Error("Failed to submit video generation task");
        
        return { success: true, ...result };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function checkVideoStatusAction(taskId: string) {
    try {
        const result = await aiClient.checkVideoTask(taskId);
        return { success: true, ...result };
    } catch (e: any) {
        return { success: false, status: "failed", error: e.message, responseBody: null };
    }
}
