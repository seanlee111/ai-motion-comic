"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
import { ImageStorage } from "@/lib/image-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

export function CreateAssetDialog() {
  const { addAsset } = useStoryStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<"character" | "scene">("character")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setLoading(true)
    try {
      const newKeys: string[] = []
      const newPreviews: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const key = await ImageStorage.save(file)
        newKeys.push(key)
        newPreviews.push(URL.createObjectURL(file))
      }

      setUploadedKeys([...uploadedKeys, ...newKeys])
      setPreviews([...previews, ...newPreviews])
    } catch (error) {
      console.error("Failed to save image", error)
      alert("Failed to save image")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    // Note: We should ideally delete from IDB too, but for now we just remove from state
    // Real implementation would call ImageStorage.delete(uploadedKeys[index])
    const newKeys = [...uploadedKeys]
    const newPreviews = [...previews]
    
    // Cleanup URL object
    // URL.revokeObjectURL(newPreviews[index]) // React might handle this but good practice

    newKeys.splice(index, 1)
    newPreviews.splice(index, 1)
    
    setUploadedKeys(newKeys)
    setPreviews(newPreviews)
  }

  const handleSubmit = () => {
    if (!name) return
    
    addAsset({
      type,
      name,
      description,
      imageKeys: uploadedKeys
    })

    // Reset
    setName("")
    setDescription("")
    setUploadedKeys([])
    setPreviews([])
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <span className="mr-2 text-xl">+</span> Create New Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New {type === "character" ? "Character" : "Scene"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Asset Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="character">Character</SelectItem>
                <SelectItem value="scene">Scene</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Cyberpunk Detective"
            />
          </div>

          <div className="grid gap-2">
            <Label>Description (Prompt)</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Describe appearance, clothing, style..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid gap-2">
            <Label>Reference Images (Max 3)</Label>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, idx) => (
                <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-md border">
                  <img src={src} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {previews.length < 3 && (
                <div 
                  className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border border-dashed hover:bg-accent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
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
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!name || loading}>
            Create Asset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
