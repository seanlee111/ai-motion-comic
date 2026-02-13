
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const FAL_KEY = process.env.FAL_KEY;

if (!FAL_KEY) {
    console.error("❌ FAL_KEY not found in .env.local");
    process.exit(1);
}

const ENDPOINTS = {
    flux_dev: "https://queue.fal.run/fal-ai/flux/dev",
    flux_general: "https://queue.fal.run/fal-ai/flux-general",
    sdxl: "https://queue.fal.run/fal-ai/fast-sdxl"
};

async function request(url: string, method: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method,
            headers: {
                'Authorization': `Key ${FAL_KEY}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error(`API Error ${res.statusCode}: ${data}`));
                } else {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data); // In case it's not JSON? Fal always returns JSON usually.
                    }
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function testModel(name: string, endpoint: string, payload: any) {
    console.log(`\nTesting ${name} at ${endpoint}...`);
    try {
        const startRes = await request(endpoint, 'POST', payload);
        console.log("Submit Response:", startRes);

        if (startRes.request_id) {
            const requestId = startRes.request_id;
            console.log(`Task ID: ${requestId}`);
            
            let status = 'IN_QUEUE';
            // Use the returned status_url directly
            const correctStatusUrl = startRes.status_url;
            console.log(`Using correct status URL: ${correctStatusUrl}`);

            while (status !== 'COMPLETED' && status !== 'FAILED') {
                await new Promise(r => setTimeout(r, 1000));
                
                try {
                    const statusRes = await request(correctStatusUrl, 'GET');
                    status = statusRes.status;
                    process.stdout.write(`Status: ${status} `);
                    
                    if (status === 'COMPLETED') {
                        console.log("\n✅ Success!");
                        // Fetch result
                        const resultUrl = startRes.response_url; // Use returned response_url
                        const resultRes = await request(resultUrl, 'GET');
                        console.log("Images:", resultRes.images?.map((i: any) => i.url));
                    } else if (status === 'FAILED') {
                        console.log("\n❌ Failed:", statusRes.error);
                    }
                } catch (e: any) {
                    console.log(`\n❌ Error polling: ${e.message}`);
                    break;
                }
            }
        }
    } catch (e: any) {
        console.error(`❌ Error testing ${name}:`, e.message);
    }
}

async function run() {
    // Test 1: Flux Dev (Text to Image)
    await testModel("Flux Dev (Text-to-Image)", ENDPOINTS.flux_dev, {
        prompt: "A futuristic city at sunset, cinematic lighting",
        image_size: "landscape_16_9",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: false
    });

    // Test 2: Flux General (Text to Image - Should work too)
    // await testModel("Flux General (Text-to-Image)", ENDPOINTS.flux_general, {
    //     prompt: "A cute robot holding a flower",
    //     image_size: "square_hd",
    //     num_inference_steps: 28,
    //     guidance_scale: 3.5,
    //     enable_safety_checker: false
    // });
}

run();
