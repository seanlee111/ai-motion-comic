"use client"

import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsModal() {
  const { 
    falKey, setFalKey, 
    klingKey, setKlingKey, 
    minimaxKey, setMinimaxKey,
    jimengKey, setJimengKey,
    nanobananaKey, setNanobananaKey,
    llmKey, setLlmKey
  } = useAppStore()
  
  // Local state to avoid hydration mismatch if accessing localStorage immediately
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
            Configure your API keys here. They are stored locally.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="image" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="image">Image Gen</TabsTrigger>
            <TabsTrigger value="video">Video Gen</TabsTrigger>
            <TabsTrigger value="script">Script (LLM)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="image" className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fal-key">FAL_KEY (Flux - Recommended)</Label>
              <Input
                id="fal-key"
                value={falKey}
                onChange={(e) => setFalKey(e.target.value)}
                placeholder="Enter Fal.ai Key (fal_...)"
                type="password"
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="nanobanana-key">NANOBANANA_KEY (Reserved)</Label>
              <Input
                id="nanobanana-key"
                value={nanobananaKey}
                onChange={(e) => setNanobananaKey(e.target.value)}
                placeholder="Enter Nanobanana Key"
                type="password"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="video" className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="kling-key">KLING_KEY (Kuaishou)</Label>
              <Input
                id="kling-key"
                value={klingKey}
                onChange={(e) => setKlingKey(e.target.value)}
                placeholder="Enter Kling Key"
                type="password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minimax-key">MINIMAX_KEY (Hailuo)</Label>
              <Input
                id="minimax-key"
                value={minimaxKey}
                onChange={(e) => setMinimaxKey(e.target.value)}
                placeholder="Enter Minimax Key"
                type="password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jimeng-key">JIMENG_KEY (Dreamina)</Label>
              <Input
                id="jimeng-key"
                value={jimengKey}
                onChange={(e) => setJimengKey(e.target.value)}
                placeholder="Enter Jimeng Key"
                type="password"
              />
            </div>
          </TabsContent>

          <TabsContent value="script" className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="llm-key">LLM_KEY (OpenAI/Minimax)</Label>
                <div className="text-xs text-muted-foreground mb-2">
                    Required for AI Script Writer feature. Supports OpenAI compatible format.
                </div>
                <Input
                    id="llm-key"
                    value={llmKey}
                    onChange={(e) => setLlmKey(e.target.value)}
                    placeholder="sk-..."
                    type="password"
                />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
