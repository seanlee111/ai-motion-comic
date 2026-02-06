import { NextRequest, NextResponse } from "next/server";
import { getModelConfig } from "@/lib/ai-models";
import { getProvider } from "@/lib/ai-providers/registry";

export const runtime = "nodejs";

type ServiceStatus = {
  ok: boolean;
  message?: string;
  requestId?: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const probe = searchParams.get("probe") === "1";

  const status: Record<string, ServiceStatus> = {};

  const klingConfig = getModelConfig("kling-v1");
  const jimengConfig = getModelConfig("jimeng-v4");

  const llmKey = process.env.LLM_KEY;
  status.llm = { ok: !!llmKey, message: llmKey ? "configured" : "missing LLM_KEY" };

  if (!klingConfig) {
    status.kling = { ok: false, message: "missing model config" };
  } else if (!process.env.KLING_ACCESS_KEY || !process.env.KLING_SECRET_KEY) {
    status.kling = { ok: false, message: "missing KLING_ACCESS_KEY/KLING_SECRET_KEY" };
  } else if (!probe) {
    status.kling = { ok: true, message: "configured" };
  } else {
    try {
      const provider = getProvider(klingConfig.provider);
      const res = await provider.generate({
        modelConfig: klingConfig,
        prompt: "test",
        aspect_ratio: "1:1",
      } as any);
      status.kling = { ok: true, message: "submit ok", requestId: res.request_id };
    } catch (e: any) {
      status.kling = { ok: false, message: e.message || "submit failed" };
    }
  }

  if (!jimengConfig) {
    status.jimeng = { ok: false, message: "missing model config" };
  } else if (!process.env.JIMENG_AK || !process.env.JIMENG_SK) {
    status.jimeng = { ok: false, message: "missing JIMENG_AK/JIMENG_SK" };
  } else if (!probe) {
    status.jimeng = { ok: true, message: "configured" };
  } else {
    try {
      const provider = getProvider(jimengConfig.provider);
      const res = await provider.generate({
        modelConfig: jimengConfig,
        prompt: "test",
        aspect_ratio: "1:1",
      } as any);
      status.jimeng = { ok: true, message: "submit ok", requestId: res.request_id };
    } catch (e: any) {
      status.jimeng = { ok: false, message: e.message || "submit failed" };
    }
  }

  return NextResponse.json({ probe, status });
}

