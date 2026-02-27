"use client"

import { useState, useEffect } from "react"
import { useStoryStore } from "@/lib/story-store"
import { Button } from "@/components/ui/button"
import { Loader2, Film, Play, RefreshCw, Upload, Image as ImageIcon, Video, Music, ArrowLeft, Filter } from "lucide-react"
import { generateVideoAction } from "@/app/actions/ai"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

export function VideoGenerator() {
  const { frames, updateFrame } = useStoryStore()
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  
  // Controls
  const [model, setModel] = useState("doubao-seedance-1-5-pro")
  const [duration, setDuration] = useState("5s")
  const [prompt, setPrompt] = useState("")

  // Use a derived selectedFrame that always reflects the latest store state
  const selectedFrame = frames.find(f => f.id === selectedFrameId) || frames[0]

  useEffect(() => {
      // Set initial selection if none
      if (!selectedFrameId && frames.length > 0) {
          setSelectedFrameId(frames[0].id)
      }
  }, [frames.length, selectedFrameId])

  // Sync local prompt state when switching frames
  useEffect(() => {
      if (selectedFrame) {
          // Initialize prompt with stored videoPrompt, fallback to storyScript
          setPrompt(selectedFrame.videoPrompt || selectedFrame.storyScript || "")
      }
  }, [selectedFrame?.id])

  const handlePromptChange = (val: string) => {
      setPrompt(val);
      if (selectedFrame) {
          updateFrame(selectedFrame.id, { videoPrompt: val } as any);
      }
  };

  const handleGenerateVideo = async () => {
    if (!selectedFrame) return;
    
    // Prefer explicitly selected images, fallback to first in array
    const startImg = selectedFrame.startImageUrl || selectedFrame.startImages?.[0]?.url;
    const endImg = selectedFrame.endImageUrl || selectedFrame.endImages?.[0]?.url;

    if (!startImg || !endImg) {
        toast.error("需要首尾关键帧才能生成视频");
        return;
    }

    // Use global store state instead of local state
    updateFrame(selectedFrame.id, { isGenerating: true, videoPrompt: prompt } as any);
    
    try {
        const res = await generateVideoAction(startImg, endImg, prompt);
        if (!res.success) {
            throw new Error(res.error);
        }
        
        // Add to history and update current
        const newVersion = {
            id: crypto.randomUUID(),
            url: res.videoUrl,
            prompt: prompt,
            modelId: model,
            duration: parseInt(duration),
            timestamp: Date.now()
        };
        
        const currentVersions = selectedFrame.videoVersions || [];
        
        updateFrame(selectedFrame.id, { 
            videoUrl: res.videoUrl,
            videoVersions: [newVersion, ...currentVersions],
            isGenerating: false
        } as any); 
        
        toast.success("视频生成成功");
    } catch (e: any) {
        toast.error(e.message);
        updateFrame(selectedFrame.id, { isGenerating: false } as any);
    }
  };

  const isGenerating = selectedFrame?.isGenerating || false;

  if (frames.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Film className="h-12 w-12 mb-4 opacity-20" />
              <p>暂无分镜数据，请先在“关键帧生成”页面完成分镜制作。</p>
          </div>
      )
  }

  return (
    <div className="flex h-full bg-[#121212] text-white overflow-hidden">
        {/* Left Sidebar - Controls */}
        <div className="w-[320px] flex-none border-r border-[#333] flex flex-col bg-[#1a1a1a]">
            <div className="p-4 border-b border-[#333] flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm">第1幕：镜头{frames.findIndex(f => f.id === selectedFrameId) + 1}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Tabs removed as requested */}
                
                <div className="flex gap-2 p-1 bg-[#2a2a2a] rounded-lg">
                    {/* Removed unused buttons as requested */}
                    <Button size="sm" className="flex-1 h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white shadow-none">首尾帧</Button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400">视频模型</Label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="h-9 bg-[#2a2a2a] border-0 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2a2a2a] border-[#333] text-white">
                                <SelectItem value="doubao-seedance-1-5-pro">Doubao Seedance Pro</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">限时开放</span>
                            <span className="text-[10px] text-gray-500">影调风貌，打斗特效更佳</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400">时长</Label>
                        <div className="flex bg-[#2a2a2a] rounded-md p-1">
                            <button 
                                onClick={() => setDuration("5s")}
                                className={cn("flex-1 text-xs py-1.5 rounded transition-colors", duration === "5s" ? "bg-[#333] text-white" : "text-gray-500")}
                            >
                                5s
                            </button>
                            <button 
                                onClick={() => setDuration("10s")}
                                className={cn("flex-1 text-xs py-1.5 rounded transition-colors", duration === "10s" ? "bg-[#333] text-white" : "text-gray-500")}
                            >
                                10s
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400">参考图 (首尾帧)</Label>
                        <div className="grid grid-cols-2 gap-2">
                             <div className="aspect-video bg-[#2a2a2a] rounded overflow-hidden relative border border-[#333]">
                                 {(selectedFrame?.startImageUrl || selectedFrame?.startImages?.[0]?.url) ? (
                                     <img src={selectedFrame.startImageUrl || selectedFrame.startImages?.[0]?.url} className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="flex items-center justify-center h-full text-xs text-gray-600">首帧</div>
                                 )}
                                 <div className="absolute top-1 left-1 text-[8px] bg-black/60 px-1 rounded text-white">Start</div>
                             </div>
                             <div className="aspect-video bg-[#2a2a2a] rounded overflow-hidden relative border border-[#333]">
                                 {(selectedFrame?.endImageUrl || selectedFrame?.endImages?.[0]?.url) ? (
                                     <img src={selectedFrame.endImageUrl || selectedFrame.endImages?.[0]?.url} className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="flex items-center justify-center h-full text-xs text-gray-600">尾帧</div>
                                 )}
                                 <div className="absolute top-1 right-1 text-[8px] bg-black/60 px-1 rounded text-white">End</div>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400">视频提示词</Label>
                        <Textarea 
                            value={prompt}
                            onChange={(e) => handlePromptChange(e.target.value)}
                            className="bg-[#2a2a2a] border-0 text-xs min-h-[100px] resize-none focus-visible:ring-1 focus-visible:ring-gray-600"
                            placeholder="描述视频的动态内容..."
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-[#333] flex items-center justify-end">
                <Button 
                    onClick={handleGenerateVideo} 
                    disabled={isGenerating || (!selectedFrame?.startImageUrl && !selectedFrame?.startImages?.[0]) || (!selectedFrame?.endImageUrl && !selectedFrame?.endImages?.[0])}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-9 text-xs w-full"
                >
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    {isGenerating ? "生成中..." : "生成视频"}
                </Button>
            </div>
        </div>

        {/* Center - Main Preview & Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
            {/* Main Preview */}
            <div className="flex-1 bg-black relative flex items-center justify-center p-8">
                {selectedFrame?.videoUrl ? (
                    <div className="relative w-full h-full max-h-[60vh] aspect-video bg-[#111] rounded-lg overflow-hidden border border-[#333]">
                        <video src={selectedFrame.videoUrl} controls className="w-full h-full object-contain" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 space-y-4">
                        <div className="w-24 h-24 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-2">
                            <Video className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="text-sm">暂无视频预览，请点击生成</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="bg-transparent border-[#444] text-gray-300 hover:text-white">
                                从素材库选择
                            </Button>
                            <Button variant="outline" size="sm" className="bg-transparent border-[#444] text-gray-300 hover:text-white px-2">
                                <Upload className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Timeline */}
            <div className="h-[180px] bg-[#1a1a1a] border-t border-[#333] flex flex-col">
                <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between">
                    <span className="text-xs font-medium text-gray-300">第1幕 - 共{frames.length}镜</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400"><Play className="h-3 w-3" /></Button>
                </div>
                <div className="flex-1 overflow-x-auto flex items-center p-4 gap-3 scrollbar-thin scrollbar-thumb-gray-700">
                    {frames.map((frame, idx) => (
                        <div 
                            key={frame.id}
                            onClick={() => setSelectedFrameId(frame.id)}
                            className={cn(
                                "flex-none w-[200px] h-full rounded-lg border bg-[#222] overflow-hidden cursor-pointer transition-all flex flex-col",
                                selectedFrameId === frame.id ? "border-blue-500 ring-1 ring-blue-500/50" : "border-[#333] hover:border-[#555]"
                            )}
                        >
                            <div className="h-6 flex items-center justify-between px-2 bg-[#2a2a2a] border-b border-[#333]">
                                <span className="text-[10px] font-medium text-gray-300">镜头{idx + 1}</span>
                                <span className="text-[10px] text-gray-500">
                                    {frame.videoUrl ? "已生成" : "无视频"}
                                </span>
                            </div>
                            <div className="flex-1 p-2 relative">
                                <p className="text-[10px] text-gray-500 line-clamp-3 leading-relaxed">
                                    {frame.storyScript}
                                </p>
                                {frame.startImageUrl || frame.startImages?.[0] ? (
                                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded bg-black border border-[#444] overflow-hidden">
                                        <img src={frame.startImageUrl || frame.startImages![0].url} className="w-full h-full object-cover" />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Sidebar - History */}
        <div className="w-[280px] flex-none border-l border-[#333] bg-[#1a1a1a] flex flex-col">
            <div className="p-4 border-b border-[#333] flex items-center justify-between h-[57px]">
                <span className="font-medium text-sm">版本记录</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                    <Filter className="h-3 w-3" />
                </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedFrame?.videoVersions && selectedFrame.videoVersions.length > 0 ? (
                    selectedFrame.videoVersions.map((version, idx) => (
                        <div key={version.id} className="group">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-[#333] relative">
                                <video src={version.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => updateFrame(selectedFrame.id, { videoUrl: version.url } as any)}>
                                        <Play className="h-3 w-3 ml-0.5" />
                                    </Button>
                                </div>
                                <div className="absolute bottom-1 right-1 text-[8px] bg-black/60 text-white px-1 rounded">
                                    v{selectedFrame.videoVersions!.length - idx}
                                </div>
                            </div>
                            <div className="mt-2 px-1">
                                <div className="text-[10px] text-gray-500 flex justify-between">
                                    <span>{new Date(version.timestamp).toLocaleTimeString()}</span>
                                    <span>{version.duration}s</span>
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{version.prompt}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-500 text-xs">
                        <p>没有符合筛选条件的历史记录</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  )
}
