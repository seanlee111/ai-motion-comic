"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, Play, Layout, Wand2, Settings, ArrowRight, FileText, Sparkles, ChevronRight, Copy, RefreshCw, Book, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { parseScriptAction } from "@/app/actions/script"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useStoryStore } from "@/lib/story-store"
import { StoryboardFrame } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const DEFAULT_SYSTEM_PROMPT = `你是一位专业的分镜画师和视觉叙事专家。
你的任务是将一个原始的故事创意转化为适合AI图像生成的、具有电影感的详细分镜脚本。

**扩写与创意补充：**
- 如果用户输入非常简短（如一句话），你需要发挥想象力，将其扩写为一个完整的、有起承转合的4-8个场景的微电影剧本。
- 补充细节：为场景添加具体的环境描写、光影氛围、角色动作和情感表达。
- 确保故事逻辑通顺，情节紧凑有趣。

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
    createdAt?: number;
    knowledgeBaseContext?: string;
}

export function ScriptParser() {
  const [scriptInput, setScriptInput] = useState("")
  // const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [variants, setVariants] = useState<ParsedScript[]>([])
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null)
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [knowledgeBase, setKnowledgeBase] = useState("")
  const [showKnowledgeDialog, setShowKnowledgeDialog] = useState(false)
  const [showLogsDialog, setShowLogsDialog] = useState(false)
  
  const { setFrames, script: storeScript, setScript: setStoreScript, apiLogs, addApiLog } = useStoryStore()

  // Sync with store on mount
  useEffect(() => {
      if (storeScript) setScriptInput(storeScript);
  }, []);

  const handleGenerate = async () => {
    if (!scriptInput.trim()) return;
    
    setIsGenerating(true);
    const startTime = Date.now();

    // Combine knowledge base with input if present
    let finalInput = scriptInput;
    if (knowledgeBase.trim()) {
        finalInput = `【参考知识库/背景设定】：\n${knowledgeBase}\n\n【用户创意】：\n${scriptInput}`;
    }

    try {
        const res = await parseScriptAction(finalInput, systemPrompt); 
        
        // Log the interaction
        addApiLog({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            endpoint: "parseScript",
            modelId: "deepseek-chat",
            status: res.success ? 200 : 500,
            duration: Date.now() - startTime,
            error: res.error,
            requestPayload: res.requestPayload,
            responseBody: res.responseBody
        });

        if (!res.success) {
            throw new Error(res.error);
        }
        
        const newScript = { 
            ...res.data, 
            createdAt: Date.now(),
            knowledgeBaseContext: knowledgeBase.slice(0, 50) + "..."
        };
        setVariants(prev => [newScript, ...prev]);
        setSelectedVariantIndex(0); // Select the new one
        setStoreScript(scriptInput); // Save raw script to store
        toast.success("剧本灵感生成成功");
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setIsGenerating(false);
    }
  }

  const handleApplyToStoryboard = () => {
      if (selectedVariantIndex === null || !variants[selectedVariantIndex]) return;
      const selectedScript = variants[selectedVariantIndex];
      
      // Transform ParsedScript -> StoryboardFrame[]
      const newFrames: StoryboardFrame[] = [];
      
      selectedScript.scenes.forEach(scene => {
          scene.shots.forEach(shot => {
              newFrames.push({
                  id: crypto.randomUUID(),
                  storyScript: shot.description,
                  characterIds: [],
                  customUploads: [],
                  startImages: [],
                  endImages: [],
                  // We could store more metadata here if needed
              });
          });
      });
      
      if (newFrames.length > 0) {
          setFrames(newFrames);
          toast.success(`已生成 ${newFrames.length} 个分镜并映射到故事板`);
      }
  };

  const selectedVariant = selectedVariantIndex !== null ? variants[selectedVariantIndex] : null;

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)]">
      
      {/* Column 1: AI Assistant & Input (3 cols) */}
      <Card className="col-span-3 flex flex-col h-full bg-[#1a1a1a] border-[#333] text-white">
        <CardHeader className="pb-3 border-b border-[#333]">
            <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    创意输入
                </CardTitle>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLogsDialog(true)} title="API日志">
                        <FileText className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Dialog open={showKnowledgeDialog} onOpenChange={setShowKnowledgeDialog}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="知识库设定">
                                <Book className="h-4 w-4 text-gray-500" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#333] text-white">
                            <DialogHeader>
                                <DialogTitle>剧本知识库</DialogTitle>
                                <DialogDescription>上传背景设定、世界观文档或参考资料，AI 将基于此进行创作。</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Textarea 
                                    value={knowledgeBase}
                                    onChange={(e) => setKnowledgeBase(e.target.value)}
                                    placeholder="在此粘贴世界观设定、角色小传或风格指南..."
                                    className="min-h-[200px] font-mono text-sm bg-[#111] border-[#333]"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setKnowledgeBase("")}>清空</Button>
                                    <Button onClick={() => setShowKnowledgeDialog(false)}>保存设定</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Settings className="h-4 w-4 text-gray-500" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#333] text-white">
                            <DialogHeader>
                                <DialogTitle>AI 设定</DialogTitle>
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
            </div>
            <CardDescription className="text-xs text-gray-500">
                输入你的故事想法，AI 将协助你进行扩写并生成分镜脚本。
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-3 flex flex-col gap-3">
            <Textarea
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder="例如：一个赛博朋克风格的侦探故事，主角在雨夜追踪一个神秘的信号..."
                className="flex-1 bg-[#111] border-0 resize-none text-sm leading-relaxed p-3 font-mono text-gray-300 focus-visible:ring-1 focus-visible:ring-gray-700"
            />
            {knowledgeBase && (
                <div className="text-[10px] text-blue-400 flex items-center gap-1 bg-blue-900/20 px-2 py-1 rounded">
                    <Book className="h-3 w-3" /> 已启用知识库上下文
                </div>
            )}
            <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !scriptInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isGenerating ? "正在扩写与生成..." : "生成剧本灵感"}
            </Button>
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-3xl bg-[#1a1a1a] border-[#333] text-white max-h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>API 调用日志</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 border border-[#333] rounded bg-[#111] p-4">
                {apiLogs?.map((log) => (
                    <div key={log.id} className="mb-4 pb-4 border-b border-[#333] last:border-0 font-mono text-xs">
                        <div className="flex justify-between items-center mb-2">
                            <span className={cn("font-bold", log.status === 200 ? "text-green-400" : "text-red-400")}>
                                {log.endpoint} ({log.status})
                            </span>
                            <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()} - {log.duration}ms</span>
                        </div>
                        {log.error && <div className="text-red-400 mb-2">Error: {log.error}</div>}
                        <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-1 text-gray-500 hover:text-gray-300 mb-1">
                                <ChevronRight className="h-3 w-3" /> 请求详情
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-black p-2 rounded overflow-auto max-h-[200px]">
                                        <div className="text-gray-500 mb-1">Request:</div>
                                        <pre>{JSON.stringify(log.requestPayload, null, 2)}</pre>
                                    </div>
                                    <div className="bg-black p-2 rounded overflow-auto max-h-[200px]">
                                        <div className="text-gray-500 mb-1">Response:</div>
                                        <pre>{JSON.stringify(log.responseBody, null, 2)}</pre>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                ))}
                {(!apiLogs || apiLogs.length === 0) && <div className="text-center text-gray-500">暂无日志</div>}
            </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Column 2: Inspiration/Variants (3 cols) */}
      <Card className="col-span-3 flex flex-col h-full bg-[#1a1a1a] border-[#333] text-white">
        <CardHeader className="pb-3 border-b border-[#333]">
            <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-400" />
                灵感库
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
                AI 生成的多种剧本方案
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                    {variants.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-xs">
                            <p>暂无灵感</p>
                            <p className="mt-1">请在左侧输入并生成</p>
                        </div>
                    ) : (
                        variants.map((variant, idx) => (
                            <div 
                                key={idx}
                                onClick={() => setSelectedVariantIndex(idx)}
                                className={cn(
                                    "p-3 rounded-lg border cursor-pointer transition-all hover:bg-[#252525]",
                                    selectedVariantIndex === idx 
                                        ? "bg-[#252525] border-blue-500 ring-1 ring-blue-500/50" 
                                        : "bg-[#222] border-[#333]"
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium text-sm text-gray-200 line-clamp-1">{variant.title || `方案 ${variants.length - idx}`}</h3>
                                    {idx === 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">最新</Badge>}
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-2 mb-2">
                                    {variant.scenes?.[0]?.description || "无描述"}
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-600">
                                    <span>{variant.scenes?.length || 0} 个场景</span>
                                    <span>{new Date(variant.createdAt || Date.now()).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </CardContent>
      </Card>

      {/* Column 3: Detail & Mapping (6 cols) */}
      <Card className="col-span-6 flex flex-col h-full bg-[#1a1a1a] border-[#333] text-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#333] flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Layout className="h-4 w-4 text-green-400" />
                    分镜详情
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                    查看并确认分镜内容
                </CardDescription>
            </div>
            {selectedVariant && (
                <Button 
                    onClick={handleApplyToStoryboard}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                >
                    映射到关键帧生成 <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
            )}
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-[#111]">
            <ScrollArea className="h-full">
                {!selectedVariant ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 py-20">
                        <Layout className="h-12 w-12 opacity-20" />
                        <p>请从中间栏选择一个剧本方案查看详情</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">{selectedVariant.title}</h2>
                            <div className="flex justify-center gap-2">
                                <Badge variant="outline" className="border-[#333] text-gray-400">
                                    {selectedVariant.scenes?.length} 场景
                                </Badge>
                                <Badge variant="outline" className="border-[#333] text-gray-400">
                                    {selectedVariant.scenes?.reduce((acc, s) => acc + (s.shots?.length || 0), 0)} 镜头
                                </Badge>
                            </div>
                        </div>

                        {selectedVariant.scenes?.map((scene, sIdx) => (
                            <div key={sIdx} className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-none pt-1">
                                        <div className="w-6 h-6 rounded bg-blue-900/30 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-900/50">
                                            {sIdx + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="bg-[#252525] p-4 rounded-lg border border-[#333]">
                                            <div className="font-bold text-blue-400 text-sm mb-2">{scene.location}</div>
                                            <p className="text-sm text-gray-300 leading-relaxed">{scene.description}</p>
                                            {scene.characters && scene.characters.length > 0 && (
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-[#333]">
                                                    {scene.characters.map((char, cIdx) => (
                                                        <span key={cIdx} className="text-[10px] bg-[#333] px-2 py-0.5 rounded text-gray-400 border border-[#444]">
                                                            {char}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2 pl-4 border-l-2 border-[#222] ml-3">
                                            {scene.shots?.map((shot, shotIdx) => (
                                                <div key={shotIdx} className="bg-[#1a1a1a] p-3 rounded border border-[#333] hover:border-[#444] transition-colors flex gap-3 group">
                                                    <div className="flex-none w-6 h-6 rounded-full bg-[#222] flex items-center justify-center text-[10px] font-mono text-gray-500 group-hover:text-gray-300">
                                                        {shotIdx + 1}
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-sm text-gray-300">{shot.description}</span>
                                                            <Badge variant="secondary" className="text-[10px] bg-[#222] text-gray-500 hover:bg-[#333] ml-2 shrink-0">
                                                                {shot.camera}
                                                            </Badge>
                                                        </div>
                                                        {shot.dialogue && (
                                                            <div className="text-xs text-gray-500 italic mt-1">
                                                                “{shot.dialogue}”
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-3xl bg-[#1a1a1a] border-[#333] text-white max-h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>API 调用日志</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 border border-[#333] rounded bg-[#111] p-4">
                {apiLogs?.map((log) => (
                    <div key={log.id} className="mb-4 pb-4 border-b border-[#333] last:border-0 font-mono text-xs">
                        <div className="flex justify-between items-center mb-2">
                            <span className={cn("font-bold", log.status === 200 ? "text-green-400" : "text-red-400")}>
                                {log.endpoint} ({log.status})
                            </span>
                            <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()} - {log.duration}ms</span>
                        </div>
                        {log.error && <div className="text-red-400 mb-2">Error: {log.error}</div>}
                        <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-1 text-gray-500 hover:text-gray-300 mb-1">
                                <ChevronRight className="h-3 w-3" /> 请求详情
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-black p-2 rounded overflow-auto max-h-[200px]">
                                        <div className="text-gray-500 mb-1">Request:</div>
                                        <pre>{JSON.stringify(log.requestPayload, null, 2)}</pre>
                                    </div>
                                    <div className="bg-black p-2 rounded overflow-auto max-h-[200px]">
                                        <div className="text-gray-500 mb-1">Response:</div>
                                        <pre>{JSON.stringify(log.responseBody, null, 2)}</pre>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                ))}
                {(!apiLogs || apiLogs.length === 0) && <div className="text-center text-gray-500">暂无日志</div>}
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
