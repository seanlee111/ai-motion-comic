"use client"

import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function SettingsModal() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>全局设置</DialogTitle>
          <DialogDescription>
            API 密钥通过服务器环境变量管理。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>图像模型：KLING_ACCESS_KEY, KLING_SECRET_KEY, JIMENG_AK, JIMENG_SK</div>
          <div>脚本模型：LLM_KEY</div>
          <div>更改在 Vercel 重新部署后生效。</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
