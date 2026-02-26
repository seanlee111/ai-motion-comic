"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { Pencil, Loader2, Upload, X, Sparkles } from "lucide-react"
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
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
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
                     {/* Name input is hidden or replaced by display name? The image shows name as text, but usually we edit it. Let's keep it editable but styled minimally or just keep it standard. Image shows "小女孩" as text, not input. But title is "Edit Subject". Let's provide an input but styled cleanly. */}
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
                 <div className="relative">
                     <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[140px] bg-[#111] border-0 rounded-xl resize-none text-gray-300 p-4 leading-relaxed focus-visible:ring-1 focus-visible:ring-gray-700"
                        placeholder="输入详细描述..."
                      />
                      <Button 
                        size="sm"
                        onClick={handleSmartDescription}
                        disabled={isDescribing || totalImages === 0}
                        className="absolute bottom-3 right-3 bg-[#333] hover:bg-[#444] text-white border-0 rounded-full h-8 px-3 text-xs gap-1.5 transition-colors"
                      >
                         {isDescribing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                         智能描述
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
