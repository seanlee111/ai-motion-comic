import { NextResponse } from "next/server";

export async function GET() {
  const config = {
    kling: {
      accessKey: !!process.env.KLING_ACCESS_KEY,
      secretKey: !!process.env.KLING_SECRET_KEY
    },
    jimeng: {
      accessKey: !!process.env.JIMENG_AK,
      secretKey: !!process.env.JIMENG_SK
    },
    llm: {
      apiKey: !!process.env.LLM_KEY
    }
  };

  return NextResponse.json({ config });
}
