
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config({ path: '.env.local' });

async function testJimengArkMulti() {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    console.error("Missing ARK_API_KEY");
    return;
  }

  console.log("Testing Jimeng Ark 4.5 with Base64 Image...");

  const url = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
  
  // Create a tiny base64 image (red dot)
  const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const imageUrls = [
      base64Image,
      base64Image
  ];

  const payload: any = {
      model: "doubao-seedream-4-5-251128",
      prompt: "A red dot in space",
      width: 2048,
      height: 2048,
      return_url: true,
      image_urls: imageUrls
  };

  console.log("Payload size:", JSON.stringify(payload).length);

  try {
      const response = await fetch(url, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
      });

      const text = await response.text();
      console.log("Status:", response.status);
      console.log("Response Body:", text);

      if (!response.ok) {
          console.error("Request Failed!");
      } else {
          console.log("Success!");
      }
  } catch (e) {
      console.error("Network/Script Error:", e);
  }
}

testJimengArkMulti();
