"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useStoryStore } from "@/lib/story-store"
import { Loader2, ArrowRight, Wand2 } from "lucide-react"

export default function ScriptCreationPage() {
  const router = useRouter()
  const [idea, setIdea] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const { setScript, generateStoryboardsFromScript } = useStoryStore()

  const handleGenerate = async () => {
    if (!idea.trim()) return

    setIsGenerating(true)
    try {
      // Simulate AI generation for now (or call real LLM endpoint if available)
      // In a real scenario, this would call an API to expand the idea
      const simulatedScript = `Script based on idea: ${idea}\n\n[Scene 1] A quiet morning...\n[Scene 2] Suddenly, a loud noise...`
      
      setScript(simulatedScript)
      
      // Auto-generate storyboards (mock logic in store for now)
      generateStoryboardsFromScript(simulatedScript)

      // Navigate to main editor
      router.push("/")
    } catch (error) {
      console.error("Failed to generate script:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Create Your Story</h1>
          <p className="text-muted-foreground">
            Start with a simple idea, and let AI flesh it out into a full script and storyboard.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What's your story idea?</CardTitle>
            <CardDescription>
              Describe the plot, characters, or mood. The more details, the better.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g. A cyberpunk detective searching for a lost android in a neon-lit city..."
              className="min-h-[200px] text-lg resize-none"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            
            <Button 
              className="w-full h-12 text-lg gap-2" 
              onClick={handleGenerate} 
              disabled={!idea.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Script & Storyboards...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  Generate Magic
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
           <Button variant="ghost" onClick={() => router.push("/")} className="gap-1">
             Skip to Editor <ArrowRight className="h-4 w-4" />
           </Button>
        </div>
      </div>
    </div>
  )
}
