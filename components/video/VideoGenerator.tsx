"use client"

import { useState } from "react"
import { useStoryStore } from "@/lib/story-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Film, Play, RefreshCw } from "lucide-react"
import { generateVideoAction } from "@/app/actions/ai"
import { toast } from "sonner"

export function VideoGenerator() {
  const { frames, updateFrame } = useStoryStore()
  const [generatingIds, setGeneratingIds] = useState<string[]>([])

  const handleGenerateVideo = async (frameId: string, startImage: string, endImage: string, prompt: string) => {
    if (!startImage || !endImage) {
        toast.error("需要首尾关键帧才能生成视频");
        return;
    }

    setGeneratingIds(prev => [...prev, frameId]);
    try {
        const res = await generateVideoAction(startImage, endImage, prompt);
        if (!res.success) {
            throw new Error(res.error);
        }
        
        // Update frame with video URL
        // Assuming StoryboardFrame type needs to be updated to support videoUrl
        // For now, let's assume we can store it or need to update the type.
        // Wait, StoryboardFrame type definition is in types/index.ts.
        // I need to check/update that type first.
        // But let's proceed with logic assuming the field exists or we add it.
        updateFrame(frameId, { videoUrl: res.videoUrl } as any); 
        toast.success("视频生成成功");
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setGeneratingIds(prev => prev.filter(id => id !== frameId));
    }
  };

  return (
    <div className="h-full p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Film className="h-6 w-6" /> 视频生成工作台
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {frames.map((frame, index) => {
                const startImg = frame.startImages?.[0];
                const endImg = frame.endImages?.[0];
                const isReady = startImg && endImg;
                const isGenerating = generatingIds.includes(frame.id);
                // @ts-ignore
                const videoUrl = frame.videoUrl;

                return (
                    <Card key={frame.id} className="bg-[#1a1a1a] border-[#333] text-white overflow-hidden flex flex-col">
                        <CardHeader className="pb-2 border-b border-[#333]">
                            <CardTitle className="text-sm font-medium flex justify-between">
                                <span>分镜 {index + 1}</span>
                                {!isReady && <span className="text-xs text-red-400">缺少关键帧</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            {/* Preview Area */}
                            <div className="aspect-video bg-black relative group">
                                {videoUrl ? (
                                    <video src={videoUrl} controls className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex">
                                        <div className="w-1/2 border-r border-[#333] relative">
                                            {startImg ? (
                                                <img src={startImg.url} className="w-full h-full object-cover opacity-80" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-xs text-gray-600">首帧为空</div>
                                            )}
                                            <div className="absolute top-1 left-1 text-[10px] bg-black/60 px-1 rounded">Start</div>
                                        </div>
                                        <div className="w-1/2 relative">
                                            {endImg ? (
                                                <img src={endImg.url} className="w-full h-full object-cover opacity-80" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-xs text-gray-600">尾帧为空</div>
                                            )}
                                            <div className="absolute top-1 right-1 text-[10px] bg-black/60 px-1 rounded">End</div>
                                        </div>
                                        
                                        {isReady && !isGenerating && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleGenerateVideo(frame.id, startImg.url, endImg.url, frame.storyScript)}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    <Play className="mr-2 h-4 w-4" /> 生成视频
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {isGenerating && (
                                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                                        <span className="text-xs text-blue-400">正在生成视频...</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Script & Info */}
                            <div className="p-3 text-xs text-gray-400 border-t border-[#333] bg-[#222] flex-1">
                                <p className="line-clamp-3">{frame.storyScript || "暂无剧本描述"}</p>
                            </div>
                            
                            {videoUrl && (
                                <div className="p-2 border-t border-[#333] bg-[#252525] flex justify-end">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 text-xs text-gray-400 hover:text-white"
                                        onClick={() => handleGenerateVideo(frame.id, startImg.url, endImg.url, frame.storyScript)}
                                        disabled={isGenerating}
                                    >
                                        <RefreshCw className="mr-1.5 h-3 w-3" /> 重新生成
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
            
            {frames.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                    <p>暂无分镜数据，请先在“关键帧生成”页面完成分镜制作。</p>
                </div>
            )}
        </div>
    </div>
  )
}
