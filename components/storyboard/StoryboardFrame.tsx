"use client"

import { useState } from "react"
import { Wand2, Trash2, Download, Loader2, Clock, Move } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
import { useAppStore } from "@/lib/store"
import { AssetSelector } from "./AssetSelector"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { StoryboardFrame as IStoryboardFrame } from "@/types"

interface StoryboardFrameProps {
  frame: IStoryboardFrame
  index: number
}

export function StoryboardFrame({ frame, index }: StoryboardFrameProps) {
  const { updateFrame, deleteFrame, assets } = useStoryStore()
  const { falKey } = useAppStore()
  const [loading, setLoading] = useState<"start" | "end" | "all" | null>(null)

  const generateImage = async (target: "start" | "end") => {
    if (!falKey) {
      alert("Please set your FAL_KEY in settings first")
      return
    }
    if (!frame.storyScript) {
        alert("Please enter a story script")
        return
    }

    setLoading(target)
    
    try {
      const character = assets.find(a => a.id === frame.characterId)
      const scene = assets.find(a => a.id === frame.sceneId)
      
      let fullPrompt = ""
      if (scene) fullPrompt += `[Scene: ${scene.name}, ${scene.description}] `
      if (character) fullPrompt += `[Character: ${character.name}, ${character.description}] `
      
      // Add temporal context
      const timeContext = target === "start" ? "Opening shot, start of action." : "Closing shot, end of action."
      fullPrompt += `Action: ${frame.storyScript}. ${frame.actionNotes || ""}. ${timeContext} Masterpiece, cinematic lighting, 8k.`

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fal-key": falKey
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          mode: "text-to-image",
          aspect_ratio: "16:9"
        })
      })

      if (!res.ok) throw new Error("Failed to start generation")
      const { request_id } = await res.json()

      const pollInterval = setInterval(async () => {
        try {
            const statusRes = await fetch(`/api/generate?id=${request_id}`, {
                headers: { "x-fal-key": falKey }
            })
            const data = await statusRes.json()
            
            if (data.status === "COMPLETED") {
                clearInterval(pollInterval)
                const imageUrl = data.images[0].url
                if (target === "start") {
                    updateFrame(frame.id, { startImageUrl: imageUrl })
                } else {
                    updateFrame(frame.id, { endImageUrl: imageUrl })
                }
                setLoading(null)
            } else if (data.status === "FAILED") {
                clearInterval(pollInterval)
                setLoading(null)
                alert("Generation Failed")
            }
        } catch (e) {
            clearInterval(pollInterval)
            setLoading(null)
        }
      }, 2000)

    } catch (e) {
      setLoading(null)
      alert("Error starting generation")
    }
  }

  const handleGenerateAll = async () => {
      setLoading("all")
      await Promise.all([generateImage("start"), generateImage("end")])
      setLoading(null)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 border-b hover:bg-muted/5 transition-colors">
      <div className="flex-none w-8 pt-1 text-center font-bold text-muted-foreground/50 text-xl">
        {index + 1}
      </div>
      
      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Character</label>
              <AssetSelector 
                type="character" 
                value={frame.characterId} 
                onChange={(v) => updateFrame(frame.id, { characterId: v === 'none' ? undefined : v })} 
              />
           </div>
           <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Scene</label>
              <AssetSelector 
                type="scene" 
                value={frame.sceneId} 
                onChange={(v) => updateFrame(frame.id, { sceneId: v === 'none' ? undefined : v })} 
              />
           </div>
           <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Duration (s)</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    type="number"
                    value={frame.duration || 3}
                    onChange={(e) => updateFrame(frame.id, { duration: parseInt(e.target.value) })}
                    className="pl-9"
                    min={1}
                    max={10}
                />
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Story Script</label>
                <Textarea 
                    value={frame.storyScript}
                    onChange={(e) => updateFrame(frame.id, { storyScript: e.target.value })}
                    placeholder="Describe the action..."
                    className="min-h-[100px] resize-none"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center">
                    <Move className="h-3 w-3 mr-1" /> Camera & Movement
                </label>
                <Textarea 
                    value={frame.actionNotes || ""}
                    onChange={(e) => updateFrame(frame.id, { actionNotes: e.target.value })}
                    placeholder="Pan left, zoom in, character runs..."
                    className="min-h-[100px] resize-none bg-muted/30"
                />
            </div>
        </div>

        <div className="flex items-center justify-between">
            <div className="flex gap-2">
                <Button 
                    onClick={handleGenerateAll} 
                    disabled={!!loading}
                    size="sm"
                    className="bg-primary/90 hover:bg-primary"
                >
                    {loading === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Generate Both Frames
                </Button>
                <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => generateImage("start")}
                    disabled={!!loading}
                >
                    Start Frame
                </Button>
                <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => generateImage("end")}
                    disabled={!!loading}
                >
                    End Frame
                </Button>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteFrame(frame.id)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>

      <div className="flex-none flex flex-col sm:flex-row gap-3">
        {/* Start Frame */}
        <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase text-center block">Start</span>
            <Card className="h-[140px] w-[240px] bg-muted/20 overflow-hidden flex items-center justify-center relative group border-primary/20">
                {frame.startImageUrl ? (
                    <>
                        <img src={frame.startImageUrl} alt="Start" className="h-full w-full object-cover" />
                        <a 
                            href={frame.startImageUrl} 
                            download={`frame-${index+1}-start.png`}
                            target="_blank"
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Download className="h-6 w-6 text-white" />
                        </a>
                    </>
                ) : (
                    <div className="text-[10px] text-muted-foreground text-center p-2">
                        {loading === "start" || loading === "all" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Empty"}
                    </div>
                )}
            </Card>
        </div>

        {/* End Frame */}
        <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase text-center block">End</span>
            <Card className="h-[140px] w-[240px] bg-muted/20 overflow-hidden flex items-center justify-center relative group border-primary/20">
                {frame.endImageUrl ? (
                    <>
                        <img src={frame.endImageUrl} alt="End" className="h-full w-full object-cover" />
                        <a 
                            href={frame.endImageUrl} 
                            download={`frame-${index+1}-end.png`}
                            target="_blank"
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Download className="h-6 w-6 text-white" />
                        </a>
                    </>
                ) : (
                    <div className="text-[10px] text-muted-foreground text-center p-2">
                        {loading === "end" || loading === "all" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Empty"}
                    </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  )
}
