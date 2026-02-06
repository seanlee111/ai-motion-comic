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
          <DialogTitle>Global Settings</DialogTitle>
          <DialogDescription>
            API keys are managed via environment variables on the server.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>Image models: KLING_ACCESS_KEY, KLING_SECRET_KEY, JIMENG_AK, JIMENG_SK</div>
          <div>Script model: LLM_KEY</div>
          <div>Changes take effect after a redeploy on Vercel.</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
