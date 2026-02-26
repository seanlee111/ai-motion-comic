"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wand2, ArrowRight, Loader2 } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function ScriptPage() {
  const router = useRouter()
  const { setFrames, frames } = useStoryStore()
  const [script, setScript] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!script) return

    setLoading(true)
    try {
      const res = await fetch("/api/analyze-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Analysis failed")
      }

      const data = await res.json()
      
      if (data.frames && Array.isArray(data.frames)) {
        // Transform to our internal format
        const newFrames = data.frames.map((f: any) => ({
            id: crypto.randomUUID(),
            storyScript: f.storyScript,
            actionNotes: f.actionNotes,
            duration: f.duration,
            // We can't auto-link assets yet, but we store the names
            // Maybe in future we auto-create assets?
        }))
        
        // Replace existing frames or Append? 
        // For "Script Writer" flow, usually we start fresh or append.
        // Let's ask user? For MVP, let's just Set (Replace) if empty, or Append.
        if (frames.length > 0 && frames[0].storyScript === '') {
             // If only default empty frame exists, replace it
             setFrames(newFrames)
        } else {
             // Append
             const current = frames.filter(f => f.storyScript !== '')
             setFrames([...current, ...newFrames])
        }
        
        router.push("/") // Go back to workbench
      }

    } catch (e: any) {
      console.error(e)
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>AI 剧本创作</CardTitle>
          <CardDescription>
            在下方输入你的故事创意或粗略剧本。AI 将自动将其分解为包含镜头、动作和预估时长的专业分镜脚本。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="例如：一个赛博朋克侦探走在雨夜的霓虹街道上。突然，一辆飞行汽车呼啸而过..."
            className="min-h-[300px] text-lg leading-relaxed p-6"
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
          
          <div className="flex justify-end gap-4">
             <Button variant="outline" onClick={() => router.push("/")}>
                取消
             </Button>
             <Button onClick={handleAnalyze} disabled={loading || !script} size="lg">
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        分析中...
                    </>
                ) : (
                    <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        生成分镜
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                )}
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
