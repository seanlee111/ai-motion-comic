"use client"

import { useStoryStore } from "@/lib/story-store"
import { StoryboardFrame } from "./StoryboardFrame"
import { Button } from "@/components/ui/button"
import { Plus, Wand2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { GlobalSettingsDialog } from "@/components/settings/GlobalSettingsDialog"

export function StoryboardWorkbench() {
  const { frames, addFrame } = useStoryStore()
  const router = useRouter()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none p-4 border-b flex justify-between items-center bg-background z-10">
        <h2 className="text-lg font-semibold">Storyboard ({frames.length} frames)</h2>
        <div className="flex gap-2 items-center">
            <GlobalSettingsDialog />
            <Button variant="outline" onClick={() => router.push('/script-creation')}>
                <Wand2 className="mr-2 h-4 w-4" /> AI Script
            </Button>
            <Button onClick={() => addFrame()}>
                <Plus className="mr-2 h-4 w-4" /> Add Frame
            </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {frames.map((frame, index) => (
          <StoryboardFrame key={frame.id} frame={frame} index={index} />
        ))}
        
        {frames.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>No frames yet.</p>
                <Button variant="link" onClick={() => addFrame()}>Create your first frame</Button>
            </div>
        )}
        
        <div className="p-8 flex justify-center">
            <Button variant="outline" onClick={() => addFrame()} className="w-full max-w-md border-dashed">
                <Plus className="mr-2 h-4 w-4" /> Add New Frame
            </Button>
        </div>
      </div>
    </div>
  )
}
