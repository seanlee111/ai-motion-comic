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
    <div className="flex flex-col h-full overflow-hidden relative bg-halftone text-foreground">
      {/* Interactive Background Blobs (Simplified version) */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-secondary rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />

      {/* Header Bar - Broken Grid Style */}
      <div className="flex-none p-6 border-b-4 border-black bg-white z-10 flex justify-between items-center transform -rotate-1 shadow-lg mx-4 mt-4 mb-2">
        <h2 className="text-3xl font-black uppercase tracking-tighter bg-primary text-white px-4 py-1 transform skew-x-[-10deg]">
            Storyboard <span className="text-lg font-bold text-black ml-2 not-italic">({frames.length})</span>
        </h2>
        <div className="flex gap-4 items-center">
            <GlobalSettingsDialog />
            <Button variant="outline" onClick={() => router.push('/script-creation')} className="border-2 border-black hover:bg-accent hover:text-white transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none font-bold">
                <Wand2 className="mr-2 h-4 w-4" /> AI SCRIPT
            </Button>
            <Button onClick={() => addFrame()} className="bg-secondary text-white border-2 border-black hover:bg-secondary/90 transition-all hover:-translate-y-1 shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-none font-bold">
                <Plus className="mr-2 h-5 w-5" /> ADD FRAME
            </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {frames.map((frame, index) => (
          <div key={frame.id} className="relative group">
             {/* Decorative underlying block for overlap effect */}
             <div className="absolute -inset-1 bg-black translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
             <div className="relative bg-white border-2 border-black p-1 shadow-sm">
                <StoryboardFrame frame={frame} index={index} />
             </div>
             {/* Random decorative sticker */}
             <div className="absolute -top-3 -right-3 w-8 h-8 bg-accent rounded-full border-2 border-black z-20 flex items-center justify-center font-bold text-white text-xs transform rotate-12">
                #{index + 1}
             </div>
          </div>
        ))}
        
        {frames.length === 0 && (
            <div className="flex flex-col items-center justify-center h-80 border-4 border-dashed border-black/20 rounded-none bg-white/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-halftone opacity-10 pointer-events-none" />
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mb-6 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] animate-bounce">
                    <Plus className="h-10 w-10 text-white" />
                </div>
                <p className="text-2xl font-black mb-4 uppercase tracking-tight">Canvas Empty</p>
                <Button variant="link" onClick={() => addFrame()} className="text-xl font-bold text-secondary hover:text-secondary/80 underline decoration-4 underline-offset-4">
                    START PAINTING
                </Button>
            </div>
        )}
        
        <div className="p-12 flex justify-center">
            <Button 
                variant="outline" 
                onClick={() => addFrame()} 
                className="w-full max-w-md h-20 border-4 border-black text-xl font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all hover:scale-105 shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none bg-white"
            >
                <Plus className="mr-3 h-6 w-6" /> Add New Frame
            </Button>
        </div>
      </div>
    </div>
  )
}
