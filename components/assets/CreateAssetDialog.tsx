"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
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

      setFiles([...files, ...newFiles].slice(0, 3))
      setPreviews([...previews, ...newPreviews].slice(0, 3))
    } finally {
      setLoading(false)
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

  const handleSubmit = async () => {
    if (!name) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("type", type)
      formData.append("name", name)
      formData.append("description", description)
      if (files[0]) formData.append("file", files[0])

      const res = await fetch("/api/assets", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create asset")
      }

      const data = await res.json()
      addAsset(data.asset)

      setName("")
      setDescription("")
      setFiles([])
      setPreviews([])
      setOpen(false)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
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
