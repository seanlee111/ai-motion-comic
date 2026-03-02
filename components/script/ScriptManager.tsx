"use client"

import { useState, useMemo } from "react"
import { useStoryStore } from "@/lib/story-store"
import { ParsedScript, ParsedScene, ParsedShot, StoryboardFrame } from "@/types"
import { 
    ChevronRight, 
    ChevronDown, 
    Filter, 
    RefreshCw, 
    Plus, 
    MoreHorizontal, 
    Pencil, 
    User, 
    Users,
    Layout,
    PlayCircle,
    Image as ImageIcon,
    Video,
    Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function ScriptManager() {
    const { scripts, frames } = useStoryStore()
    const [selectedScriptId, setSelectedScriptId] = useState<string | null>(scripts[0]?.id || null)
    const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>({})
    const [selectedShotId, setSelectedShotId] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<"all" | "incomplete" | "complete">("all")

    // Helper to toggle scene expansion
    const toggleScene = (sceneId: string) => {
        setExpandedScenes(prev => ({ ...prev, [sceneId]: !prev[sceneId] }))
    }

    // Get current script
    const currentScript = useMemo(() => 
        scripts.find(s => s.id === selectedScriptId), 
    [scripts, selectedScriptId])

    // Get current shot and its linked frame
    const { currentShot, linkedFrame } = useMemo(() => {
        if (!currentScript || !selectedShotId) return { currentShot: null, linkedFrame: null }
        
        let shot: ParsedShot | null = null;
        let sceneId = "";
        
        for (const scene of currentScript.scenes) {
            const found = scene.shots.find(s => s.id === selectedShotId)
            if (found) {
                shot = found;
                sceneId = scene.id;
                break;
            }
        }

        if (!shot) return { currentShot: null, linkedFrame: null }

        // Find linked frame in storyboard
        // We look for a frame that matches scriptId and shotId
        const frame = frames.find(f => f.scriptId === currentScript.id && f.shotId === shot!.id)
        
        return { currentShot: shot, linkedFrame: frame }
    }, [currentScript, selectedShotId, frames])


    if (!currentScript && scripts.length > 0) {
        setSelectedScriptId(scripts[0].id)
    }

    return (
        <div className="flex h-[calc(100vh-60px)] bg-background text-foreground overflow-hidden">
            {/* Left Sidebar: Script Tree */}
            <div className="w-80 flex flex-col border-r bg-muted/10">
                {/* Toolbar */}
                <div className="p-3 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="font-bold text-lg truncate pr-2">{currentScript?.title || "无剧本"}</div>
                        <Badge variant="secondary" className="text-xs shrink-0">{currentScript?.style || "默认"}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                         <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 flex-1">
                            <Filter className="h-3 w-3 text-muted-foreground" />
                            <select 
                                className="bg-transparent text-xs border-none focus:ring-0 p-0 w-full cursor-pointer"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                            >
                                <option value="all">全部</option>
                                <option value="incomplete">未完成</option>
                                <option value="complete">已完成</option>
                            </select>
                         </div>
                         <Button variant="ghost" size="icon" className="h-7 w-7" title="AI场景校准">
                            <RefreshCw className="h-3 w-3" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-7 w-7" title="新建镜头">
                            <Plus className="h-3 w-3" />
                         </Button>
                    </div>
                    
                    <div className="text-[10px] text-muted-foreground flex justify-between items-center">
                        <span>选中: {selectedShotId ? "1" : "0"}/{currentScript?.scenes.reduce((acc, s) => acc + s.shots.length, 0) || 0}</span>
                        <div className="flex gap-1">
                           <Button variant="ghost" size="icon" className="h-4 w-4"><MoreHorizontal className="h-3 w-3" /></Button>
                        </div>
                    </div>
                </div>

                {/* Tree Content */}
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {/* Episode Node (Root) */}
                        <div className="mb-2">
                            <div 
                                className="flex items-center gap-1 p-1.5 hover:bg-muted/50 rounded cursor-pointer font-semibold text-sm"
                                onClick={() => {/* Toggle Episode? */}}
                            >
                                <ChevronDown className="h-3 w-3 text-blue-500" />
                                <span>第1集：{currentScript?.title}</span>
                            </div>
                            
                            {/* Scenes */}
                            <div className="ml-2 pl-2 border-l border-border/50 space-y-1 mt-1">
                                {currentScript?.scenes.map(scene => (
                                    <div key={scene.id}>
                                        <div 
                                            className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded cursor-pointer group"
                                            onClick={() => toggleScene(scene.id)}
                                        >
                                            <div className="flex items-center gap-1 overflow-hidden">
                                                {expandedScenes[scene.id] ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                                <span className="text-xs font-medium truncate">{scene.location}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                0/{scene.shots.length}
                                            </span>
                                        </div>

                                        {/* Shots */}
                                        {expandedScenes[scene.id] && (
                                            <div className="ml-4 space-y-0.5 mt-0.5">
                                                {scene.shots.map((shot, idx) => (
                                                    <div 
                                                        key={shot.id}
                                                        className={cn(
                                                            "flex items-start gap-2 p-2 rounded cursor-pointer text-xs transition-colors",
                                                            selectedShotId === shot.id 
                                                                ? "bg-blue-500/10 text-blue-500" 
                                                                : "hover:bg-muted/50 text-muted-foreground"
                                                        )}
                                                        onClick={() => setSelectedShotId(shot.id)}
                                                    >
                                                        <span className={cn(
                                                            "flex-none w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono",
                                                            selectedShotId === shot.id ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {idx + 1}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-border/50">{shot.camera}</Badge>
                                                                <span className="truncate font-medium">{shot.description.slice(0, 10)}...</span>
                                                            </div>
                                                            <div className="truncate text-[10px] opacity-70">
                                                                {shot.dialogue || shot.description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Roles Section */}
                        <div className="mt-4 pt-4 border-t">
                             <div className="flex items-center gap-1 p-1.5 hover:bg-muted/50 rounded cursor-pointer font-medium text-xs text-muted-foreground">
                                <ChevronDown className="h-3 w-3" />
                                <span>角色 ({currentScript?.scenes.flatMap(s => s.characters).filter((v, i, a) => a.indexOf(v) === i).length || 0})</span>
                             </div>
                             <div className="ml-2 pl-2 space-y-1 mt-1">
                                {currentScript?.scenes.flatMap(s => s.characters).filter((v, i, a) => a.indexOf(v) === i).map((char, i) => (
                                    <div key={i} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer text-xs">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        <span>{char}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                        
                         <div className="mt-1">
                             <div className="flex items-center gap-1 p-1.5 hover:bg-muted/50 rounded cursor-pointer font-medium text-xs text-muted-foreground">
                                <ChevronRight className="h-3 w-3" />
                                <span>群演角色 (0)</span>
                             </div>
                        </div>

                    </div>
                </ScrollArea>
            </div>

            {/* Right Panel: Detail View */}
            <div className="flex-1 bg-background flex flex-col min-w-0">
                {currentShot ? (
                    <>
                        {/* Header */}
                        <div className="h-14 border-b flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Layout className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm flex items-center gap-2">
                                        分镜 {selectedShotId?.split('_').pop() || "01"}
                                        <Badge variant={linkedFrame ? "default" : "secondary"} className="text-[10px] h-4">
                                            {linkedFrame ? "进行中" : "未开始"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-1 p-6">
                            <div className="max-w-3xl mx-auto space-y-8">
                                {/* Basic Info Tags */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/5">
                                            {currentShot.camera}
                                        </Badge>
                                        <span>镜别</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono">⏱ 5s</span>
                                        <span>时长</span>
                                    </div>
                                </div>

                                {/* Text Blocks */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <ImageIcon className="h-3 w-3" /> 镜叙 (Visual)
                                        </h4>
                                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm leading-relaxed">
                                            {currentShot.description}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <PlayCircle className="h-3 w-3" /> 动作/描述 (Action)
                                        </h4>
                                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm leading-relaxed text-muted-foreground">
                                            {currentShot.dialogue ? `(对白) "${currentShot.dialogue}"` : "无对白"}
                                            <br/>
                                            {currentShot.description}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">环境 (Environment)</h4>
                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <p><span className="font-semibold">环境音：</span>--</p>
                                                <p><span className="font-semibold">道具：</span>--</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">出场角色 (Cast)</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {currentShot.character ? (
                                                    <Badge variant="secondary" className="text-xs">{currentShot.character}</Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">--</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">生成状态 (Status)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">图片</span>
                                                    <Badge variant={linkedFrame?.startImageUrl ? "default" : "secondary"} className="text-[10px]">
                                                        {linkedFrame?.startImageUrl ? "已生成" : "未开始"}
                                                    </Badge>
                                                </div>
                                                {linkedFrame?.startImageUrl ? (
                                                    <div className="aspect-video rounded-md overflow-hidden border bg-muted">
                                                        <img src={linkedFrame.startImageUrl} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video rounded-md border border-dashed bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
                                                        暂无图片
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">视频</span>
                                                    <Badge variant={linkedFrame?.videoUrl ? "default" : "secondary"} className="text-[10px]">
                                                        {linkedFrame?.videoUrl ? "已生成" : "未开始"}
                                                    </Badge>
                                                </div>
                                                 {linkedFrame?.videoUrl ? (
                                                    <div className="aspect-video rounded-md overflow-hidden border bg-black">
                                                        <video src={linkedFrame.videoUrl} className="w-full h-full object-cover" controls />
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video rounded-md border border-dashed bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
                                                        暂无视频
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Footer Action */}
                        <div className="p-4 border-t bg-muted/10 shrink-0 flex justify-center">
                            <Link href="/">
                                <Button className="w-64 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
                                    去 AI 导演生成 <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Layout className="h-12 w-12 opacity-20 mb-4" />
                        <p>请选择一个分镜查看详情</p>
                    </div>
                )}
            </div>
        </div>
    )
}
