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
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn, fileToDataURL, compressImage, dataURLtoFile } from "@/lib/utils"
import { generateDescriptionAction } from "@/app/actions/ai"

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

export function EditAssetDialog({ asset, trigger }: { asset: Asset; trigger?: React.ReactNode }) {
  const { updateAsset } = useStoryStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDescribing, setIsDescribing] = useState(false)
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

  const [expressionImages, setExpressionImages] = useState<string[]>([])
  const [newExpressionFiles, setNewExpressionFiles] = useState<File[]>([])
  const expressionInputRef = useRef<HTMLInputElement>(null)

  // Initialize state when asset changes or dialog opens
  useEffect(() => {
      if (open) {
          setType(asset.type)
          setName(asset.name)
          setDescription(asset.description || "")
          setExpressionImages(asset.expressionImages || [])
          setNewExpressionFiles([])
          
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

  const handleExpressionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      
      const newUrls: string[] = []
      const newFiles: File[] = []

      for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (expressionImages.length + newUrls.length >= 20) {
              toast.error("表情图片最多上传20张")
              break
          }
          try {
              const dataUrl = await fileToDataURL(file)
              const compressed = await compressImage(dataUrl, 1024, 0.7)
              const compressedFile = dataURLtoFile(compressed, file.name)
              newUrls.push(compressed)
              newFiles.push(compressedFile)
          } catch (err) {
              console.error(err)
          }
      }

      setExpressionImages(prev => [...prev, ...newUrls])
      setNewExpressionFiles(prev => [...prev, ...newFiles])
      
      if (expressionInputRef.current) expressionInputRef.current.value = ''
  }

  const removeExpressionImage = (index: number) => {
      // Logic to remove from state. 
      // Note: We need to be careful about correlating with newExpressionFiles if we were uploading, 
      // but simpler is just to rely on URL list for UI and handle file mapping at submit time if needed.
      // However, to keep it simple, we just remove from URL list. 
      // For new files, we might leak them in state but that's okay for now or we filter them.
      
      // Better approach: maintain a parallel structure or just rely on URLs.
      // But since we need to upload FILE objects for new ones, we need to track them.
      // Let's just track them by index? No, deleting from middle breaks index.
      // Simplified: Just keep newFiles array in sync? 
      // Actually, for simplicity in this turn, we won't perfectly sync the "newFiles" removal 
      // because we only upload "newExpressionFiles" that are *appended*. 
      // If user deletes a "new" image, we should ideally remove it from newExpressionFiles.
      
      // Let's assume user mostly uploads and keeps. 
      // Correct implementation:
      const urlToRemove = expressionImages[index]
      setExpressionImages(prev => prev.filter((_, i) => i !== index))
      
      // If it was a newly uploaded file (blob: or data:), try to remove from newFiles
      // We can't easily map back unless we store objects { url, file }.
      // Let's accept a small bug where deleted new files might still be uploaded 
      // OR we just upload all newFiles and the backend only links the ones that are in the final list?
      // Actually, we should just rebuild the file list at submit time based on the URLs? No, can't get File from URL easily.
      
      // Let's store objects locally
  }

  const handleFileChange = async (viewName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
        const dataUrl = await fileToDataURL(file);
        const compressedDataUrl = await compressImage(dataUrl, 1024, 0.7);
        const compressedFile = dataURLtoFile(compressedDataUrl, file.name);
        
        setViewImages(prev => ({ ...prev, [viewName]: compressedDataUrl }))
        setNewFilesMap(prev => ({ ...prev, [viewName]: compressedFile }))
    } catch (e) {
        console.error("Compression failed", e);
        // Fallback
        const previewUrl = URL.createObjectURL(file)
        setViewImages(prev => ({ ...prev, [viewName]: previewUrl }))
        setNewFilesMap(prev => ({ ...prev, [viewName]: file }))
    }
    
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

  const handleSubmit = async () => {
    if (!name || !updateAsset) return
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

      // Process Expression Images
      // We need to send new files and map them correctly.
      // But for simplicity, let's just upload all newExpressionFiles under key "expressionFile"
      // and send "expressionUrls" for existing ones.
      // However, we need to know the order.
      // Let's use a simpler strategy:
      // 1. "expressionImages" contains the final list of URLs (some http, some data:).
      // 2. We filter out data: URLs from "expressionImages" -> these are existing ones.
      // 3. We filter "newExpressionFiles" to only those whose dataURL is still present in "expressionImages"? Hard.
      
      // Better strategy: Just upload ALL newExpressionFiles. The server will return their new URLs.
      // Then we reconstruct the final array on the server? No, server doesn't know order.
      
      // Let's do this:
      // Send `expressionMetadata` array: ["url_1", "file:0", "url_2", "file:1"]
      // Then append `expressionFiles` in order of their appearance in the metadata.
      
      const expressionMetadata: string[] = [];
      const expressionFilesToUpload: File[] = [];
      
      // We need to match expressionImages entries to newExpressionFiles
      // This is tricky without an ID.
      // Let's assume we iterate expressionImages. If it starts with "data:", it's a new file.
      // We need to find WHICH new file.
      // To solve this, let's just find the file in newExpressionFiles by matching size/name or just re-convert?
      // Re-converting dataURL to File is expensive.
      
      // Let's just iterate expressionImages. If data:, take the next available from newExpressionFiles? 
      // No, order might be mixed if user deleted some.
      
      // Simple fix: When adding to newExpressionFiles, also store the dataURL in a map?
      // Or just loop through newExpressionFiles and see if its dataURL matches?
      
      // Let's just trust that we haven't implemented complex delete-reorder for new files yet.
      // If we just append, then:
      let newFileIndex = 0;
      for (const imgUrl of expressionImages) {
          if (imgUrl.startsWith("data:")) {
              // It's a new file. Find it in newExpressionFiles?
              // Let's just assume we can re-create it from dataURL if needed, OR just grab from newExpressionFiles queue.
              // But we don't know which one.
              
              // Correct way: When selecting files, store { id, url, file }.
              // But since we are here, let's just convert dataURL back to File!
              // We have `dataURLtoFile` utility.
              const file = dataURLtoFile(imgUrl, `expression_${Date.now()}_${Math.random()}.jpg`);
              expressionMetadata.push(`file:${expressionFilesToUpload.length}`);
              expressionFilesToUpload.push(file);
          } else {
              expressionMetadata.push(imgUrl);
          }
      }
      
      formData.append("expressionMetadata", JSON.stringify(expressionMetadata));
      expressionFilesToUpload.forEach(f => formData.append("expressionFiles", f));

      const res = await fetch("/api/assets", { method: "PATCH", body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "更新素材失败")
      }
      const data = await res.json()
      if (updateAsset) {
          updateAsset(asset.id, data.asset)
      }
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
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-[#1a1a1a] border-[#333] text-white flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center justify-between mr-8">
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

        <ScrollArea className="flex-1">
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
          </div>

          <div className="grid grid-cols-1 gap-6">
              <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
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

              {type === 'character' && (
                  <div className="space-y-3">
                      <div className="flex items-center justify-between">
                          <Label className="text-gray-400 text-xs uppercase tracking-wider font-semibold">表情图片 ({expressionImages.length}/20)</Label>
                          <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                              onClick={() => expressionInputRef.current?.click()}
                          >
                              <Plus className="h-3 w-3 mr-1" /> 添加表情
                          </Button>
                          <input 
                              type="file" 
                              multiple 
                              className="hidden" 
                              ref={expressionInputRef}
                              accept="image/*"
                              onChange={handleExpressionUpload}
                          />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                          {expressionImages.map((url, i) => (
                              <div key={i} className="relative aspect-square rounded overflow-hidden group bg-[#2a2a2a] border border-transparent hover:border-gray-500">
                                  <img src={url} className="w-full h-full object-cover" />
                                  <button 
                                      onClick={() => removeExpressionImage(i)}
                                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                  >
                                      <X className="h-3 w-3 text-white" />
                                  </button>
                              </div>
                          ))}
                          {expressionImages.length < 20 && (
                              <div 
                                  onClick={() => expressionInputRef.current?.click()}
                                  className="aspect-square rounded border border-dashed border-gray-700 hover:border-gray-500 hover:bg-[#2a2a2a] cursor-pointer flex items-center justify-center transition-colors"
                              >
                                  <Plus className="h-4 w-4 text-gray-500" />
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
        </div>
        </ScrollArea>

        <div className="p-6 pt-2 flex justify-end gap-3 bg-transparent shrink-0">
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
