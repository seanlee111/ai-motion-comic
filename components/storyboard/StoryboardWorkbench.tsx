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
      {/* Floating Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/20 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
      
      <div className="flex-none p-6 border-b border-white/10 flex justify-between items-center glass-panel z-10 mx-6 mt-6 rounded-3xl">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Storyboard <span className="text-sm font-normal text-muted-foreground ml-2">({frames.length} frames)</span>
        </h2>
        <div className="flex gap-3 items-center">
            <GlobalSettingsDialog />
            <Button variant="outline" onClick={() => router.push('/script-creation')} className="rounded-full glass-card hover:bg-white/20 border-white/20 btn-magnetic">
                <Wand2 className="mr-2 h-4 w-4 text-primary" /> AI Script
            </Button>
            <Button onClick={() => addFrame()} className="rounded-full bg-primary/80 hover:bg-primary text-white shadow-lg shadow-primary/20 btn-magnetic backdrop-blur-md">
                <Plus className="mr-2 h-4 w-4" /> Add Frame
            </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {frames.map((frame, index) => (
          <div key={frame.id} className="glass-card rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5">
             <StoryboardFrame frame={frame} index={index} />
          </div>
        ))}
        
        {frames.length === 0 && (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground glass-card rounded-3xl mx-auto max-w-2xl">
                <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-4 animate-float">
                    <Plus className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium mb-2">Your story begins here</p>
                <Button variant="link" onClick={() => addFrame()} className="text-primary hover:text-primary/80">Create your first dream frame</Button>
            </div>
        )}
        
        <div className="p-8 flex justify-center">
            <Button variant="outline" onClick={() => addFrame()} className="w-full max-w-md border-dashed border-2 rounded-3xl h-16 hover:bg-primary/5 hover:border-primary/30 transition-all btn-magnetic">
                <Plus className="mr-2 h-5 w-5" /> Add New Frame
            </Button>
        </div>
      </div>
    </div>
  )
}
