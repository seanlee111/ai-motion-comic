"use client"

import { useState, useRef } from "react"
import { Upload, Wand2, Image as ImageIcon, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ControlPanelProps {
  onGenerate: (data: any) => void
  isGenerating: boolean
}

export function ControlPanel({ onGenerate, isGenerating }: ControlPanelProps) {
  const [mode, setMode] = useState<"text-to-image" | "image-to-image">("text-to-image")
  const [prompt, setPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [model, setModel] = useState("flux-pro-1.1")
  const [refImage, setRefImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setRefImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    onGenerate({
      mode,
      prompt,
      aspect_ratio: aspectRatio,
      model,
      image_url: refImage,
    })
  }

  return (
    <div className="h-full w-full max-w-sm space-y-4 border-r bg-card p-4">
      <div className="flex items-center space-x-2">
        <Button
          variant={mode === "text-to-image" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setMode("text-to-image")}
        >
          <Type className="mr-2 h-4 w-4" />
          Text to Image
        </Button>
        <Button
          variant={mode === "image-to-image" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setMode("image-to-image")}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Img to Img
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Prompt</Label>
        <Textarea
          placeholder="Describe your scene (Supports Chinese/English)..."
          className="min-h-[120px]"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      {mode === "image-to-image" && (
        <div className="space-y-2">
          <Label>Reference Image</Label>
          <div 
            className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed hover:bg-accent"
            onClick={() => fileInputRef.current?.click()}
          >
            {refImage ? (
              <img src={refImage} alt="Ref" className="h-full w-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <Upload className="mb-2 h-6 w-6" />
                <span className="text-xs">Click to upload</span>
              </div>
            )}
            <Input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Aspect Ratio</Label>
        <Select value={aspectRatio} onValueChange={setAspectRatio}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
            <SelectItem value="1:1">1:1 (Square)</SelectItem>
            <SelectItem value="2.35:1">2.35:1 (Cinematic)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flux-pro-1.1">Flux Pro 1.1 (Best)</SelectItem>
            <SelectItem value="sdxl">SDXL (Faster)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
        size="lg"
        onClick={handleSubmit}
        disabled={isGenerating || !prompt}
      >
        {isGenerating ? (
          <>Generating...</>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Keyframe
          </>
        )}
      </Button>
    </div>
  )
}
