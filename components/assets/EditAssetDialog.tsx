"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { Pencil, Loader2, Upload, X, Sparkles, Wand2, Plus } from "lucide-react"
import { Asset } from "@/types"
import { useStoryStore } from "@/lib/story-store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { generateDescriptionAction, completeViewsAction } from "@/app/actions/ai"

const VIEW_CONFIGS = {
    3: ["Front", "Side", "Back"],
    5: ["Front", "Side", "Back", "Three-Quarter", "Close-up"]
}

const VIEW_LABELS: Record<string, string> = {
    "Front": "正视图",
    "Side": "侧视图",
    "Back": "后视图",
    "Three-Quarter": "3/4侧视图",
    "Close-up": "特写"
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export function EditAssetDialog({ asset, trigger }: { asset: Asset; trigger?: React.ReactNode }) {
  const { updateAsset } = useStoryStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDescribing, setIsDescribing] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [apiLogs, setApiLogs] = useState<string[]>([])
  
  const [type, setType] = useState<"character" | "scene">(asset.type)
  const [name, setName] = useState(asset.name)
  const [description, setDescription] = useState(asset.description || "")
  
  // View State
  const [viewMode, setViewMode] = useState<3 | 5>(5)
  // Mapping from View Name -> URL (either existing or new preview)
  const [viewImages, setViewImages] = useState<Record<string, string>>({})
  const [newFilesMap, setNewFilesMap] = useState<Record<string, File>>({})
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Initialize state when asset changes or dialog opens
  useEffect(() => {
      if (open) {
          setType(asset.type)
          setName(asset.name)
          setDescription(asset.description || "")
          
          // Hydrate views from asset.views if exists, otherwise map urls roughly
          const initialViews: Record<string, string> = {}
          if (asset.views) {
              Object.assign(initialViews, asset.views)
          } else if (asset.imageUrls && asset.imageUrls.length > 0) {
              // Legacy fallback: assign to slots in order
              const views = VIEW_CONFIGS[5]
              asset.imageUrls.slice(0, 5).forEach((url, i) => {
                  if (views[i]) initialViews[views[i]] = url
              })
          } else if (asset.imageUrl) {
              initialViews["Front"] = asset.imageUrl
          }
          setViewImages(initialViews)
          setNewFilesMap({})
      }
  }, [asset, open])

  const currentViews = VIEW_CONFIGS[viewMode]

  const handleFileChange = (viewName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    
    setViewImages(prev => ({ ...prev, [viewName]: previewUrl }))
    setNewFilesMap(prev => ({ ...prev, [viewName]: file }))
    
    // Clear input
    if (fileInputRefs.current[viewName]) {
        fileInputRefs.current[viewName]!.value = ''
    }
  }

  const removeImage = (viewName: string) => {
      // If it was a new file, revoke object url
      if (newFilesMap[viewName]) {
          URL.revokeObjectURL(viewImages[viewName])
      }
      
      const newImages = { ...viewImages }
      delete newImages[viewName]
      setViewImages(newImages)
      
      const newFiles = { ...newFilesMap }
      delete newFiles[viewName]
      setNewFilesMap(newFiles)
  }

  const addLog = (msg: string) => setApiLogs(prev => [msg, ...prev].slice(0, 5))

  const handleSmartDescription = async () => {
    const activeImages = Object.values(viewImages);
    if (activeImages.length === 0) {
        toast.error("请先上传或保留参考图片");
        return;
    }
    
    setIsDescribing(true);
    addLog(`[Describe] Requesting for ${activeImages.length} images...`)
    try {
        const result = await generateDescriptionAction(activeImages);
        
        if (!result.success) {
            addLog(`[Describe] Error: ${result.error}`)
            throw new Error(result.error);
        }
        
        addLog(`[Describe] Success. Length: ${result.description?.length}`)
        if (result.description) {
            setDescription(result.description);
            toast.success("智能描述生成成功");
        }
    } catch (e: any) {
        addLog(`[Describe] Exception: ${e.message}`)
        toast.error(e.message);
    } finally {
        setIsDescribing(false);
    }
  };

  const handleSmartDraw = async () => {
      const activeViews = Object.keys(viewImages);
      if (activeViews.length === 0) {
          toast.error("请先至少上传一张参考图片");
          return;
      }
      
      const missingViews = currentViews.filter(v => !viewImages[v]);
      if (missingViews.length === 0) {
          toast.info("所有视图已存在，无需补全");
          return;
      }

      setIsDrawing(true);
      addLog(`[Draw] Requesting views: ${missingViews.join(', ')}`)
      try {
          const result = await completeViewsAction(viewImages, missingViews, description);

          if (!result.success) {
              addLog(`[Draw] Error: ${result.error}`)
              throw new Error(result.error);
          }

          addLog(`[Draw] Success. Generated: ${Object.keys(result.generatedViews || {}).join(', ')}`)
          if (result.generatedViews) {
              setViewImages(prev => ({ ...prev, ...result.generatedViews }));
              toast.success(`成功补全 ${Object.keys(result.generatedViews).length} 个视图`);
          }

      } catch (e: any) {
          addLog(`[Draw] Exception: ${e.message}`)
          toast.error(e.message);
      } finally {
          setIsDrawing(false);
      }
  };

  const handleSubmit = async () => {
    if (!name) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("id", asset.id)
      formData.append("type", type)
      formData.append("name", name)
      formData.append("description", description)
      
      // Serialize the views map (keys only, values will be updated URLs)
      // Actually we need to upload new files and get URLs back, then store the map.
      // The API expects `files` and handles them.
      // We need a way to tell API which file belongs to which view.
      // Strategy: Send `viewsMetadata` JSON: { "Front": "existing_url", "Side": "file_index_0" }
      
      const viewsMetadata: Record<string, string> = {};
      const filesToUpload: File[] = [];
      
      Object.entries(viewImages).forEach(([view, url]) => {
          if (newFilesMap[view]) {
              viewsMetadata[view] = `file:${filesToUpload.length}`;
              filesToUpload.push(newFilesMap[view]);
          } else {
              viewsMetadata[view] = url;
          }
      });
      
      formData.append("viewsMetadata", JSON.stringify(viewsMetadata));
      filesToUpload.forEach(f => formData.append("files", f));
      
      // Also maintain legacy arrays for compatibility
      const legacyUrls = Object.values(viewImages).filter(url => !url.startsWith("blob:"));
      formData.append("existingImageUrls", JSON.stringify(legacyUrls));

      const res = await fetch("/api/assets", { method: "PATCH", body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "更新素材失败")
      }
      const data = await res.json()
      updateAsset(asset.id, data.asset)
      setOpen(false)
      toast.success("素材更新成功")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="secondary" size="icon" className="h-6 w-6">
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-[#1a1a1a] border-[#333] text-white">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">编辑主体</DialogTitle>
            {type === 'character' && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">视图模式:</span>
                    <Select value={viewMode.toString()} onValueChange={(v) => setViewMode(parseInt(v) as 3 | 5)}>
                        <SelectTrigger className="h-7 w-[100px] bg-[#2a2a2a] border-0 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a2a] border-[#444] text-white">
                            <SelectItem value="3">三视图</SelectItem>
                            <SelectItem value="5">五视图</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
          </div>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6">
          {/* View Slots Grid */}
          <div className="grid grid-cols-5 gap-3">
             {currentViews.map((viewName) => {
                 const hasImage = !!viewImages[viewName];
                 return (
                     <div key={viewName} className="space-y-2 flex flex-col">
                         <div className="text-[10px] text-center text-gray-400 uppercase tracking-wider font-semibold">{VIEW_LABELS[viewName] || viewName}</div>
                         <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-[#2a2a2a] group border border-transparent hover:border-gray-500 transition-colors flex items-center justify-center">
                             {hasImage ? (
                                 <>
                                    <img src={viewImages[viewName]} className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => removeImage(viewName)}
                                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                    >
                                        <X className="h-3 w-3 text-white" />
                                    </button>
                                 </>
                             ) : (
                                 <div 
                                    onClick={() => fileInputRefs.current[viewName]?.click()}
                                    className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-[#333] transition-colors gap-2 text-gray-500 hover:text-gray-300"
                                 >
                                     <Plus className="h-6 w-6" />
                                     <span className="text-[10px]">上传</span>
                                 </div>
                             )}
                             
                             <input
                                type="file"
                                ref={el => { fileInputRefs.current[viewName] = el }}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFileChange(viewName, e)}
                             />
                         </div>
                     </div>
                 )
             })}
             
             {/* Smart Draw Action (If missing views exist) */}
             {type === 'character' && Object.keys(viewImages).length > 0 && Object.keys(viewImages).length < currentViews.length && (
                 <div className="flex flex-col justify-end pb-1 items-center">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleSmartDraw}
                        disabled={isDrawing}
                        className={`h-12 w-12 rounded-full border transition-all duration-1000 relative overflow-hidden ${
                            isDrawing 
                            ? "bg-transparent border-transparent text-white" 
                            : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 border-blue-500/30"
                        }`}
                        title="智能补全剩余视角"
                     >
                         {isDrawing ? (
                             <>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[spin_3s_linear_infinite] opacity-50 blur-sm" />
                                <div className="absolute inset-[2px] bg-[#1a1a1a] rounded-full z-10" />
                                <Loader2 className="h-6 w-6 animate-[spin_3s_linear_infinite] relative z-20 text-blue-400" />
                             </>
                         ) : (
                             <Wand2 className="h-6 w-6" />
                         )}
                     </Button>
                     <span className={`text-[10px] mt-2 text-center font-medium transition-colors duration-1000 ${isDrawing ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse" : "text-blue-400"}`}>
                        {isDrawing ? "绘制中..." : "一键补全"}
                     </span>
                 </div>
             )}
          </div>

          <div className="grid grid-cols-1 gap-6">
              <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                     <div className="text-2xl font-bold">{name}</div>
                     <Input 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="bg-transparent border-0 border-b border-gray-700 rounded-none px-0 text-lg font-bold focus-visible:ring-0 focus-visible:border-white h-auto py-1 placeholder:text-gray-600"
                        placeholder="输入名称"
                     />
                  </div>
                  <div className="w-[120px]">
                      <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger className="bg-[#2a2a2a] border-0 text-white h-9 rounded-full px-4">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a2a] border-[#444] text-white">
                            <SelectItem value="character">角色</SelectItem>
                            <SelectItem value="scene">场景</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
              </div>

              <div className="space-y-3 relative">
                 <div className="flex justify-between items-end">
                     <Label className="text-gray-400">描述</Label>
                 </div>
                 {/* API Log Viewer - Helpful for debugging */}
                 <div className="text-[10px] text-gray-500 font-mono mb-1 select-all h-[60px] overflow-y-auto bg-black/20 p-2 rounded border border-white/5">
                    {apiLogs.length === 0 ? "Ready." : apiLogs.map((log, i) => (
                        <div key={i} className="whitespace-nowrap">{log}</div>
                    ))}
                 </div>
                 <div className="relative group/desc">
                     <div className={`absolute -inset-[1px] rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 transition-opacity duration-1000 ${isDescribing ? "opacity-100 animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]" : ""}`} />
                     <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`min-h-[140px] bg-[#111] border-0 rounded-xl resize-none text-gray-300 p-4 leading-relaxed focus-visible:ring-1 focus-visible:ring-gray-700 relative z-10 ${isDescribing ? "bg-[#111]/90" : ""}`}
                        placeholder="输入详细描述..."
                      />
                      <Button 
                        size="sm"
                        onClick={handleSmartDescription}
                        disabled={isDescribing || Object.keys(viewImages).length === 0}
                        className={`absolute bottom-3 right-3 border-0 rounded-full h-8 px-3 text-xs gap-1.5 transition-all duration-500 z-20 overflow-hidden ${
                            isDescribing 
                            ? "bg-transparent text-white ring-1 ring-white/20" 
                            : "bg-[#333] hover:bg-[#444] text-white"
                        }`}
                      >
                         {isDescribing && (
                             <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-[shimmer_3s_infinite] opacity-50" />
                         )}
                         <span className="relative flex items-center gap-1.5">
                            {isDescribing ? <Loader2 className="h-3 w-3 animate-[spin_3s_linear_infinite]" /> : <Sparkles className="h-3 w-3" />}
                            {isDescribing ? "生成中..." : "智能描述"}
                         </span>
                      </Button>
                 </div>
              </div>
          </div>
        </div>

        <div className="p-6 pt-2 flex justify-end gap-3 bg-transparent">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)} 
            disabled={loading}
            className="bg-[#333] hover:bg-[#444] text-white rounded-lg px-6"
          >
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !name}
            className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold rounded-lg px-6"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            确定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
