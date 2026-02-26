"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { Pencil, Loader2, Upload, X, Sparkles, Wand2 } from "lucide-react"
import { Asset } from "@/types"
import { useStoryStore } from "@/lib/story-store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const MAX_IMAGES = 5;

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
  
  const [type, setType] = useState<"character" | "scene">(asset.type)
  const [name, setName] = useState(asset.name)
  const [description, setDescription] = useState(asset.description || "")
  
  // Image State
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize state when asset changes or dialog opens
  useEffect(() => {
      if (open) {
          setType(asset.type)
          setName(asset.name)
          setDescription(asset.description || "")
          
          const initialUrls = asset.imageUrls || (asset.imageUrl ? [asset.imageUrl] : [])
          setExistingImageUrls(initialUrls)
          setNewFiles([])
          setNewPreviews([])
      }
  }, [asset, open])

  const isDirty = useMemo(() => {
    const originalUrls = asset.imageUrls || (asset.imageUrl ? [asset.imageUrl] : [])
    const urlsChanged = 
        existingImageUrls.length !== originalUrls.length ||
        !existingImageUrls.every((url, i) => url === originalUrls[i]) ||
        newFiles.length > 0;
        
    return type !== asset.type || name !== asset.name || description !== (asset.description || "") || urlsChanged
  }, [asset, description, existingImageUrls, newFiles.length, name, type])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    const currentTotal = existingImageUrls.length + newFiles.length
    const remainingSlots = MAX_IMAGES - currentTotal
    
    if (remainingSlots <= 0) return

    const filesToAdd: File[] = []
    const previewsToAdd: string[] = []

    for (let i = 0; i < Math.min(selectedFiles.length, remainingSlots); i++) {
        const file = selectedFiles[i]
        filesToAdd.push(file)
        previewsToAdd.push(URL.createObjectURL(file))
    }

    setNewFiles([...newFiles, ...filesToAdd])
    setNewPreviews([...newPreviews, ...previewsToAdd])
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeExistingImage = (index: number) => {
      setExistingImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
      const updatedFiles = [...newFiles]
      const updatedPreviews = [...newPreviews]
      
      URL.revokeObjectURL(updatedPreviews[index])
      
      updatedFiles.splice(index, 1)
      updatedPreviews.splice(index, 1)
      
      setNewFiles(updatedFiles)
      setNewPreviews(updatedPreviews)
  }

  const handleSmartDescription = async () => {
    if (existingImageUrls.length === 0 && newFiles.length === 0) {
        toast.error("请先上传或保留参考图片");
        return;
    }
    
    setIsDescribing(true);
    try {
        // Prepare images: existing URLs + base64 of new files
        const imagesToSend = [...existingImageUrls];
        
        if (newFiles.length > 0) {
            const base64New = await Promise.all(newFiles.map(fileToBase64));
            imagesToSend.push(...base64New);
        }
        
        const res = await fetch("/api/ai/describe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: imagesToSend })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "描述生成失败");
        }
        
        const data = await res.json();
        if (data.description) {
            setDescription(prev => prev ? prev + "\n" + data.description : data.description);
            toast.success("智能描述生成成功");
        }
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setIsDescribing(false);
    }
  };

  const handleSmartDraw = async () => {
      const totalImages = existingImageUrls.length + newFiles.length;
      if (totalImages >= MAX_IMAGES) {
          toast.error("已达到最大图片数量 (5张)");
          return;
      }
      if (totalImages === 0) {
          toast.error("请先至少上传一张参考图片");
          return;
      }

      setIsDrawing(true);
      try {
          // 1. Prepare images for API (Base64/URLs)
          const imagesToSend = [...existingImageUrls];
          if (newFiles.length > 0) {
              const base64New = await Promise.all(newFiles.map(fileToBase64));
              imagesToSend.push(...base64New);
          }

          // 2. Call the smart draw API
          const res = await fetch("/api/ai/complete-views", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  images: imagesToSend,
                  description: description, // Use current description if available as context
                  assetType: type
              })
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "智能绘图失败");
          }

          const data = await res.json();
          if (data.newImages && data.newImages.length > 0) {
              // Append new images (URLs) to existingImageUrls list directly since they are URLs
              setExistingImageUrls(prev => [...prev, ...data.newImages]);
              toast.success(`成功生成 ${data.newImages.length} 张新视图`);
          } else {
              toast.info("未生成新视图，可能已有足够的视图或无法识别。");
          }

      } catch (e: any) {
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
      
      // Append existing URLs to keep
      formData.append("existingImageUrls", JSON.stringify(existingImageUrls))
      
      // Append new files
      newFiles.forEach(file => {
          formData.append("files", file)
      })

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

  const totalImages = existingImageUrls.length + newFiles.length

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
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-[#1a1a1a] border-[#333] text-white">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">编辑主体</DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6">
          {/* Image Preview Strip */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent items-center">
             {/* Existing Images */}
             {existingImageUrls.map((url, idx) => (
                 <div key={`exist-${idx}`} className="relative flex-none w-[120px] aspect-[3/4] rounded-lg overflow-hidden bg-[#2a2a2a] group border border-transparent hover:border-gray-500 transition-colors">
                     <img src={url} className="w-full h-full object-cover" />
                     <button 
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                     >
                         <X className="h-3 w-3 text-white" />
                     </button>
                 </div>
             ))}
             
             {/* New Images */}
             {newPreviews.map((url, idx) => (
                 <div key={`new-${idx}`} className="relative flex-none w-[120px] aspect-[3/4] rounded-lg overflow-hidden bg-[#2a2a2a] group border border-transparent hover:border-gray-500 transition-colors">
                     <img src={url} className="w-full h-full object-cover" />
                     <button 
                        onClick={() => removeNewImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                     >
                         <X className="h-3 w-3 text-white" />
                     </button>
                 </div>
             ))}

             {/* Add Button */}
             {totalImages < MAX_IMAGES && (
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-none w-[120px] aspect-[3/4] rounded-lg bg-[#2a2a2a] border border-dashed border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:bg-[#333] transition-colors text-gray-400 gap-2"
                 >
                     <Upload className="h-6 w-6" />
                     <span className="text-xs">添加图片</span>
                 </div>
             )}
             
             {/* Smart Draw Button (Only visible if < 5 images) */}
             {totalImages > 0 && totalImages < MAX_IMAGES && (
                 <div className="ml-2 flex flex-col justify-center h-full">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleSmartDraw}
                        disabled={isDrawing}
                        className={`h-10 w-10 rounded-full border transition-all duration-1000 relative overflow-hidden ${
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
                                <Loader2 className="h-5 w-5 animate-[spin_3s_linear_infinite] relative z-20 text-blue-400" />
                             </>
                         ) : (
                             <Wand2 className="h-5 w-5" />
                         )}
                     </Button>
                     <span className={`text-[10px] mt-1 text-center font-medium transition-colors duration-1000 ${isDrawing ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse" : "text-blue-400"}`}>
                        {isDrawing ? "绘制中..." : "智能补全"}
                     </span>
                 </div>
             )}

             <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
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
                        disabled={isDescribing || totalImages === 0}
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
