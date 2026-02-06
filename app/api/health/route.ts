import { NextRequest, NextResponse } from "next/server";
import { JimengProvider } from "@/lib/api/providers/jimeng";
import { KlingProvider } from "@/lib/api/providers/kling";

export const runtime = "nodejs";

type ServiceStatus = {
  ok: boolean;
  message?: string;
  detail?: string;
  requestId?: string;
  endpoint?: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const probe = searchParams.get("probe") === "1";

  const status: Record<string, ServiceStatus> = {};

  const llmKey = process.env.LLM_KEY;
  status.llm = { ok: !!llmKey, message: llmKey ? "configured" : "missing LLM_KEY" };

  // Check Kling
  if (!process.env.KLING_ACCESS_KEY || !process.env.KLING_SECRET_KEY) {
    status.kling = { ok: false, message: "missing KLING_ACCESS_KEY/KLING_SECRET_KEY" };
  } else if (!probe) {
    status.kling = { ok: true, message: "configured" };
  } else {
    try {
      const provider = new KlingProvider();
      const res = await provider.generate({
        model: "kling-v2",
        prompt: "test",
        aspect_ratio: "1:1"
      });
      status.kling = { ok: true, message: "submit ok", requestId: res.taskId, endpoint: "https://api.klingai.com" };
    } catch (e: any) {
      const msg = e.message || "submit failed";
      // APIError format
      const detail = e.detail ? JSON.stringify(e.detail, null, 2) : undefined;
      status.kling = { ok: false, message: msg, detail, endpoint: "https://api.klingai.com" };
    }
  }

  // Check Jimeng
  if (!process.env.JIMENG_AK || !process.env.JIMENG_SK) {
    status.jimeng = { ok: false, message: "missing JIMENG_AK/JIMENG_SK" };
  } else if (!probe) {
    status.jimeng = { ok: true, message: "configured" };
  } else {
    try {
      const provider = new JimengProvider();
      const res = await provider.generate({
        model: "jimeng-v4",
        prompt: "test",
        aspect_ratio: "1:1"
      });
      status.jimeng = { ok: true, message: "submit ok", requestId: res.taskId, endpoint: "https://visual.volcengineapi.com" };
    } catch (e: any) {
      const msg = e.message || "submit failed";
       // APIError format
      const detail = e.detail ? JSON.stringify(e.detail, null, 2) : undefined;
      status.jimeng = { ok: false, message: msg, detail, endpoint: "https://visual.volcengineapi.com" };
    }
  }

  return NextResponse.json({ probe, status });
}
