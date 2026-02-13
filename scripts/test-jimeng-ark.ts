
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ARK_API_KEY = process.env.ARK_API_KEY || process.env.JIMENG_AK;

if (!ARK_API_KEY) {
    console.error("❌ ARK_API_KEY (or JIMENG_AK) not found in .env.local");
    process.exit(1);
}

const ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

async function request(url: string, method: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method,
            headers: {
                'Authorization': `Bearer ${ARK_API_KEY}`,
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
                        resolve(data);
                    }
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function testJimengArk() {
    console.log(`\nTesting Jimeng 4.5 (Ark) at ${ENDPOINT}...`);
    
    const payload = {
        model: "doubao-seedream-4-5-251128",
        prompt: "A futuristic city at sunset, cinematic lighting, 8k",
        response_format: "url",
        size: "2K", 
        stream: false,
        watermark: false,
        sequential_image_generation: "auto",
        sequential_image_generation_options: { max_images: 2 }
    };

    try {
        const startRes = await request(ENDPOINT, 'POST', payload);
        console.log("Response:", JSON.stringify(startRes, null, 2));

        if (startRes.data && startRes.data.length > 0) {
            console.log("\n✅ Success!");
            console.log("Images:", startRes.data.map((i: any) => i.url));
        } else {
            console.log("\n❌ Failed: No images returned");
        }
    } catch (e: any) {
        console.error(`❌ Error testing Jimeng Ark:`, e.message);
    }
}

testJimengArk();
