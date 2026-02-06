"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Activity, Copy } from "lucide-react"

type HealthStatus = {
  ok: boolean
  message?: string
  requestId?: string
}

type HealthResponse = {
  probe: boolean
  status: {
    kling?: HealthStatus
    jimeng?: HealthStatus
    llm?: HealthStatus
  }
}

export function ApiHealthDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HealthResponse | null>(null)
  const [raw, setRaw] = useState<string>("")

  const runCheck = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/health?probe=1")
      const data = await res.json()
      setResult(data)
      setRaw(JSON.stringify(data, null, 2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Activity className="mr-2 h-4 w-4" />
          API 自检
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>API 连通性检测</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button onClick={runCheck} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            开始检测
          </Button>
          {result && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => raw && navigator.clipboard.writeText(raw)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  复制结果
                </Button>
              </div>
              <div className="flex justify-between">
                <span>Kling</span>
                <span className={result.status.kling?.ok ? "text-green-600" : "text-red-600"}>
                  {result.status.kling?.ok ? "OK" : "FAIL"} {result.status.kling?.message || ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Jimeng</span>
                <span className={result.status.jimeng?.ok ? "text-green-600" : "text-red-600"}>
                  {result.status.jimeng?.ok ? "OK" : "FAIL"} {result.status.jimeng?.message || ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span>LLM</span>
                <span className={result.status.llm?.ok ? "text-green-600" : "text-red-600"}>
                  {result.status.llm?.ok ? "OK" : "FAIL"} {result.status.llm?.message || ""}
                </span>
              </div>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
{raw}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
