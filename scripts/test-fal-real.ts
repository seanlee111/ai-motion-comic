
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables manually since we are running via ts-node
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { FalProvider } from '../lib/api/providers/fal/index';

async function testFal() {
    console.log("Testing Fal API...");
    const provider = new FalProvider();

    // 1. Test Text-to-Image (Flux Dev)
    console.log("\n--- Test 1: Text-to-Image (Flux Dev) ---");
    try {
        const result1 = await provider.generate({
            prompt: "A cute cat sitting on a futuristic cyberpunk rooftop, neon lights, 8k",
            model: "fal-flux-dev",
            aspect_ratio: "16:9",
            mode: "text-to-image"
        });
        console.log("Submit Result:", result1);

        if (result1.taskId) {
            console.log("Polling status...");
            let status = result1.status;
            while (status !== 'COMPLETED' && status !== 'FAILED') {
                await new Promise(r => setTimeout(r, 2000));
                const check = await provider.checkStatus(result1.taskId, result1.providerData?.endpoint);
                status = check.status;
                process.stdout.write(`Status: ${status} `);
                if (status === 'COMPLETED') {
                    console.log("\nImage URL:", check.images?.[0]);
                } else if (status === 'FAILED') {
                    console.log("\nError:", check.error);
                }
            }
        }
    } catch (e) {
        console.error("Test 1 Failed:", e);
    }

    // 2. Test Image-to-Image (Flux General) - Mock URL
    // We need a real URL for img2img to work, or it will fail validation.
    // Skipping for now unless we have a valid URL.
}

testFal();
