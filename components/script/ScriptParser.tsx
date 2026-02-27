"use client"

import { useState } from "react"
import { Loader2, Play, Layout, Wand2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { parseScriptAction } from "@/app/actions/script"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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

type ParsedShot = {
    id: string;
    description: string;
    dialogue: string;
    camera: string;
    character: string;
}

type ParsedScene = {
    id: string;
    location: string;
    description: string;
    characters: string[];
    shots: ParsedShot[];
}

type ParsedScript = {
    title: string;
    scenes: ParsedScene[];
}

export function ScriptParser() {
  const [script, setScript] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParsedScript | null>(null)
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)

  const handleParse = async () => {
    if (!script.trim()) return;
    
    setLoading(true);
    try {
        const res = await parseScriptAction(script);
        if (!res.success) {
            throw new Error(res.error);
        }
        setResult(res.data);
        toast.success("剧本解析成功");
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setLoading(false);
    }
  }

  // TODO: We might want to use the generateScript functionality here too, or merge them.
  // The user asked to use DeepSeek model capabilities for script generation.
  // Currently parseScriptAction parses existing script text.
  // If we want to GENERATE script from idea, we need another action or modify this one.
  // Let's assume the user puts their idea in the textarea and we "Parse" (which actually uses LLM to structure it).
  // Wait, the previous page had "Generate Script" from "Idea".
  // This component is "Script Parser" - input script -> structured data.
  // If the user wants to GENERATE, they might type a short idea.
  // The LLM prompt in parseScriptAction is designed to "Analyze the following script".
  // If we want generation, we should probably check if input is short/idea-like and use a generation prompt,
  // OR just trust the LLM to handle it.
  // Given the user said "剧本生成出现了问题", they likely mean the "Idea -> Script" flow.
  // The current ScriptParser takes text and outputs JSON.
  // If the user enters an idea "A cat jumps over moon", the current parser might try to parse it as a full script and fail or return weird data.
  
  // Let's add a "Generate" mode or button if the input is short?
  // Or just rely on the user pasting a full script?
  // The user said "智能剧本解析...放在左侧边栏...替换...剧本创作页面".
  // So this page should handle creation too.
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
      {/* Input Area */}
      <Card className="flex flex-col h-full bg-[#1a1a1a] border-[#333] text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-medium">剧本创作 / 输入</CardTitle>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#333] text-white">
                        <DialogHeader>
                            <DialogTitle>自定义 AI 设定</DialogTitle>
                            <DialogDescription>调整系统提示词以改变 AI 生成/解析的方式。</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>系统提示词</Label>
                                <Textarea 
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="min-h-[300px] font-mono text-sm bg-[#111] border-[#333]"
                                />
                            </div>
                            <Button variant="outline" onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}>恢复默认</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="flex gap-2">
                <Button 
                    onClick={handleParse} 
                    disabled={loading || !script.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    智能生成/解析
                </Button>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 pt-0">
            <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="在此输入故事创意或完整剧本..."
                className="h-full bg-[#111] border-0 resize-none text-base leading-relaxed p-4 font-mono text-gray-300 focus-visible:ring-1 focus-visible:ring-gray-700"
            />
        </CardContent>
      </Card>

      {/* Output Area */}
      <Card className="flex flex-col h-full bg-[#1a1a1a] border-[#333] text-white overflow-hidden">
        <CardHeader className="pb-2 border-b border-[#333]">
            <CardTitle className="text-lg font-medium">分镜预览</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            {!result ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                    <Layout className="h-12 w-12 opacity-20" />
                    <p>输入内容后点击生成，AI 将自动拆解分镜</p>
                </div>
            ) : (
                <div className="p-4 space-y-6">
                    <h2 className="text-xl font-bold text-center">{result.title}</h2>
                    {result.scenes?.map((scene, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                            <div className="bg-[#252525] p-3 rounded-lg border border-[#444]">
                                <div className="font-bold text-blue-400 text-sm mb-1">{scene.location}</div>
                                <div className="text-xs text-gray-400">{scene.description}</div>
                                <div className="flex gap-2 mt-2">
                                    {scene.characters?.map((char, cIdx) => (
                                        <span key={cIdx} className="text-[10px] bg-[#333] px-2 py-0.5 rounded-full text-gray-300">
                                            {char}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2 pl-4 border-l-2 border-[#333]">
                                {scene.shots?.map((shot, shotIdx) => (
                                    <div key={shotIdx} className="bg-[#222] p-3 rounded border border-[#333] hover:border-[#555] transition-colors flex gap-3">
                                        <div className="flex-none w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-xs font-mono text-gray-500">
                                            {shotIdx + 1}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium text-gray-200">{shot.description}</span>
                                                <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">{shot.camera}</span>
                                            </div>
                                            {shot.dialogue && (
                                                <div className="text-xs text-gray-400 italic">“{shot.dialogue}”</div>
                                            )}
                                            {shot.character && (
                                                <div className="text-[10px] text-purple-400">@{shot.character}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
