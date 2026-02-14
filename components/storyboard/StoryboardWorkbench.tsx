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
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex-none p-6 border-b border-rough flex justify-between items-center bg-background/50 z-10 backdrop-blur-sm">
        <h2 className="text-2xl font-serif font-bold text-foreground italic tracking-wide">
            Storyboard <span className="text-base font-sans font-normal text-muted-foreground not-italic ml-2">({frames.length} frames)</span>
        </h2>
        <div className="flex gap-3 items-center">
            <GlobalSettingsDialog />
            <Button variant="outline" onClick={() => router.push('/script-creation')} className="border-rough bg-card hover:bg-accent hover:text-white transition-colors shadow-sm">
                <Wand2 className="mr-2 h-4 w-4" /> AI Script
            </Button>
            <Button onClick={() => addFrame()} className="shadow-impasto bg-primary text-primary-foreground border-none hover:translate-y-[-1px]">
                <Plus className="mr-2 h-4 w-4" /> Add Frame
            </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {frames.map((frame, index) => (
          <div key={frame.id} className="transform hover:rotate-1 transition-transform duration-500 ease-out">
             <StoryboardFrame frame={frame} index={index} />
          </div>
        ))}
        
        {frames.length === 0 && (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground border-rough bg-card/50 m-4 rounded-sm">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 wet-paint-hover">
                    <Plus className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="font-serif italic text-lg">The canvas is empty.</p>
                <Button variant="link" onClick={() => addFrame()} className="text-primary font-bold">Start your masterpiece</Button>
            </div>
        )}
        
        <div className="p-8 flex justify-center">
            <Button variant="outline" onClick={() => addFrame()} className="w-full max-w-md border-rough border-dashed h-16 text-lg font-serif italic text-muted-foreground hover:text-primary hover:border-solid hover:bg-white/50 transition-all">
                <Plus className="mr-2 h-5 w-5" /> Add New Frame
            </Button>
        </div>
      </div>
    </div>
  )
}
