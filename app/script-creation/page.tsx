"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useStoryStore } from "@/lib/story-store"
import { Loader2, ArrowRight, Wand2, Settings } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const DEFAULT_SYSTEM_PROMPT = `你是一位专业的分镜画师和视觉叙事专家。
你的任务是将一个原始的故事创意转化为适合AI图像生成的、具有电影感的详细分镜脚本。

**目标：** 创建一系列4-8个独特的场景，讲述一个连贯的故事，并具有清晰的视觉推进感。

**格式要求：**
1. **标题：** 每个场景必须以"[Scene X]"开头（例如：[Scene 1]）。
2. **描述：** 紧接着在同一段落中提供详细的视觉描述。
3. **要素：** 每个场景必须明确包含：
   - **主体：** 谁或什么在焦点中？
   - **动作：** 发生了什么？
   - **镜头：** 镜头角度（如：广角、特写、低角度）和运动。
   - **光影/氛围：** 时间、天气、光照风格（如：电影感、体积光、霓虹）。
   - **风格：** 艺术风格或美学（如：赛博朋克、水彩、写实）。

**约束：**
- **不要**使用对话剧本格式（如："Bob: Hello"）。如果角色说话，请描述他们的表情或动作。
- 确保场景之间的视觉过渡流畅。
- 描述要生动，但要足够简洁，以便作为图像生成的提示词。

**示例输出：**
[Scene 1] 荒凉的火星殖民地日落时的广角建立镜头。红色的尘土在生锈的居住圆顶周围盘旋。光线是长长的、戏剧性的阴影，带着刺眼的橙色光辉。电影科幻风格，8k分辨率。

[Scene 2] 沙地上一只破裂的头盔面罩的特写。面罩的反射中显示远处有一道神秘的蓝光正在逼近。高对比度，悬疑惊悚氛围。
`

export default function ScriptCreationPage() {
  const router = useRouter()
  const [idea, setIdea] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const { setScript, generateStoryboardsFromScript } = useStoryStore()

  const handleGenerate = async () => {
    if (!idea.trim()) return

    setIsGenerating(true)
    try {
      // Call DeepSeek API to generate script
      const response = await fetch("/api/v1/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            idea,
            systemPrompt 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate script");
      }

      const { data } = await response.json();
      const generatedScript = data.script;
      
      setScript(generatedScript)
      
      // Auto-generate storyboards
      generateStoryboardsFromScript(generatedScript)

      // Navigate to main editor
      router.push("/")
    } catch (error) {
      console.error("Failed to generate script:", error)
      // TODO: Show error toast
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="space-y-6">
        <div className="text-center space-y-2 relative">
          <h1 className="text-3xl font-bold tracking-tight">创作你的故事</h1>
          <p className="text-muted-foreground">
            从一个简单的想法开始，让 AI 把它充实成完整的剧本和分镜。
          </p>
          
          <div className="absolute right-0 top-0">
              <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>自定义 AI 人设</DialogTitle>
                        <DialogDescription>
                            调整系统提示词以改变 AI 生成剧本的方式。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>系统提示词</Label>
                            <Textarea 
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                className="min-h-[300px] font-mono text-sm"
                            />
                        </div>
                        <Button variant="outline" onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}>
                            恢复默认
                        </Button>
                    </div>
                </DialogContent>
              </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>你的故事想法是什么？</CardTitle>
            <CardDescription>
              描述情节、角色或氛围。细节越多越好。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="例如：一个赛博朋克侦探在霓虹灯闪烁的城市中寻找丢失的机器人..."
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
                  正在生成剧本和分镜...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  施展魔法 (生成)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
           <Button variant="ghost" onClick={() => router.push("/")} className="gap-1">
             跳过，直接进入编辑器 <ArrowRight className="h-4 w-4" />
           </Button>
        </div>
      </div>
    </div>
  )
}
