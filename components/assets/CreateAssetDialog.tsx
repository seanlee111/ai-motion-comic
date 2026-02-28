"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2, Sparkles } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createAssetAction } from "@/app/actions/assets"
import { generateDescriptionAction } from "@/app/actions/ai"

const MAX_IMAGES = 5;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export function CreateAssetDialog() {
  const { addAsset } = useStoryStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDescribing, setIsDescribing] = useState(false)
  const [type, setType] = useState<"character" | "scene">("character")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setLoading(true)
    try {
      const newFiles: File[] = []
      const newPreviews: string[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        newFiles.push(file)
        newPreviews.push(URL.createObjectURL(file))
      }

      const combinedFiles = [...files, ...newFiles].slice(0, MAX_IMAGES)
      const combinedPreviews = [...previews, ...newPreviews].slice(0, MAX_IMAGES)
      
      setFiles(combinedFiles)
      setPreviews(combinedPreviews)
    } finally {
      setLoading(false)
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    const newFiles = [...files]
    const newPreviews = [...previews]
    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const handleSmartDescription = async () => {
    if (files.length === 0) {
        toast.error("请先上传参考图片");
        return;
    }
    
    setIsDescribing(true);
    try {
        const base64Images = await Promise.all(files.map(fileToBase64));
        const result = await generateDescriptionAction(base64Images);
        
        if (!result.success) {
            throw new Error(result.error || "描述生成失败");
        }
        
        if (result.description) {
            setDescription(prev => prev ? prev + "\n" + result.description : result.description);
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
      formData.append("type", type)
      formData.append("name", name)
      formData.append("description", description)
      
      files.forEach(file => {
          formData.append("files", file);
      });

      const res = await createAssetAction(formData)
      if (!res.success) {
        throw new Error(res.error || "创建素材失败")
      }

      if (res.asset && addAsset) {
          addAsset(res.asset)
      }

      setName("")
      setDescription("")
      setFiles([])
      setPreviews([])
      setOpen(false)
      toast.success("素材创建成功")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <span className="mr-2 text-xl">+</span> 创建新素材
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>创建新{type === "character" ? "角色" : "场景"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            
          {/* Images Section */}
          <div className="space-y-2">
            <Label>参考图片 (最多{MAX_IMAGES}张)</Label>
            <div className="flex flex-wrap gap-3">
              {previews.map((src, idx) => (
                <div key={idx} className="relative h-24 w-24 overflow-hidden rounded-lg border bg-muted group">
                  <img src={src} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {previews.length < MAX_IMAGES && (
                <div 
                  className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed hover:bg-accent transition-colors gap-1 text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                  <span className="text-[10px]">上传</span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>名称</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="例如：赛博朋克侦探"
                />
              </div>
              <div className="grid gap-2">
                <Label>素材类型</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="character">角色</SelectItem>
                    <SelectItem value="scene">场景</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between items-center">
                <Label>描述 (提示词)</Label>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={handleSmartDescription}
                    disabled={isDescribing || files.length === 0}
                >
                    {isDescribing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                    智能描述
                </Button>
            </div>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="描述外貌、服装、风格..."
              className="min-h-[120px] resize-none"
            />
          </div>

        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!name || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "创建素材"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
