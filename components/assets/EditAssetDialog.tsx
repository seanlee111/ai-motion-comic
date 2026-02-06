"use client"

import { useMemo, useRef, useState } from "react"
import { Pencil, Loader2, Upload, X } from "lucide-react"
import { Asset } from "@/types"
import { useStoryStore } from "@/lib/story-store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function EditAssetDialog({ asset, trigger }: { asset: Asset; trigger?: React.ReactNode }) {
  const { updateAsset } = useStoryStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<"character" | "scene">(asset.type)
  const [name, setName] = useState(asset.name)
  const [description, setDescription] = useState(asset.description || "")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(asset.imageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDirty = useMemo(() => {
    return type !== asset.type || name !== asset.name || description !== (asset.description || "") || !!file
  }, [asset.description, asset.name, asset.type, description, file, name, type])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  const handleSubmit = async () => {
    if (!name) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("id", asset.id)
      formData.append("type", type)
      formData.append("name", name)
      formData.append("description", description)
      if (file) formData.append("file", file)

      const res = await fetch("/api/assets", { method: "PATCH", body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update asset")
      }
      const data = await res.json()
      updateAsset(asset.id, data.asset)
      setOpen(false)
    } catch (e: any) {
      alert(e.message)
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
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
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Description (Prompt)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="grid gap-2">
            <Label>Reference Image</Label>
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 overflow-hidden rounded-md border bg-muted">
                {preview ? (
                  <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                  <Upload className="mr-2 h-4 w-4" />
                  Replace
                </Button>
                {file && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null)
                      setPreview(asset.imageUrl || null)
                    }}
                    disabled={loading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name || !isDirty}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
