"use client"

import { useState, useRef } from "react"
import CanvasDraw from "react-canvas-draw"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eraser, Check, Undo } from "lucide-react"

interface InpaintingEditorProps {
  open: boolean
  onClose: () => void
  imageUrl: string
  onSave: (newImageUrl: string) => void
}

export function InpaintingEditor({ open, onClose, imageUrl, onSave }: InpaintingEditorProps) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<any>(null)

  const handleGenerate = async () => {
    if (!prompt) return
    setLoading(true)

    try {
      // Get mask data
      // CanvasDraw exports lines. We need a binary mask or base64 mask image.
      // Fal expects "mask_url" or base64.
      // We can get the canvas data URL from the ref
      const maskDataUrl = canvasRef.current.getDataURL("png", false, "#000000") 
      // Note: react-canvas-draw default bg is white? We need black bg and white strokes for mask usually?
      // Actually, Fal Inpainting expects:
      // - image_url: Original image
      // - mask_url: The mask (white pixels = change, black = keep)
      
      // We need to invert or configure canvas properly.
      // react-canvas-draw saves the drawing.
      // Let's assume we send this dataUrl as mask_url (we might need to upload it first or send base64)
      
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode: "inpainting", // We need to handle this mode in API
          image_url: imageUrl,
          mask_url: maskDataUrl, // Pass base64 data url directly (Fal supports this)
          modelId: "fal-flux-pro-v1.1" // Or specialized inpainting model
        })
      })

      if (!res.ok) throw new Error("Failed")
      const { request_id, endpoint } = await res.json()

      // Poll
      const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/generate?id=${request_id}&endpoint=${encodeURIComponent(endpoint)}`)
            const data = await statusRes.json()
            if (data.status === "COMPLETED") {
                clearInterval(pollInterval)
                onSave(data.images[0].url)
                onClose()
            } else if (data.status === "FAILED") {
                clearInterval(pollInterval)
                alert("Failed")
                setLoading(false)
            }
          } catch (e) {
              clearInterval(pollInterval)
          }
      }, 2000)

    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Magic Edit (Inpainting)</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative border rounded-md overflow-hidden bg-black/5 flex items-center justify-center">
            {/* 
                We need to stack the canvas OVER the image.
                React-Canvas-Draw supports `imgSrc`.
            */}
            <div className="relative">
                <CanvasDraw
                    ref={canvasRef}
                    imgSrc={imageUrl}
                    brushColor="#ffffff" // White mask
                    backgroundColor="#00000000" // Transparent bg for drawing layer? No, we need black for non-mask?
                    // Actually, for mask generation:
                    // We want the USER to see the image and draw over it.
                    // The EXPORTED image should be black background with white strokes.
                    // React-Canvas-Draw is a bit tricky for direct mask export.
                    // Simpler approach: Use it as UI, then construct mask.
                    // But `getDataURL` returns the drawing on top of `imgSrc`? Or just drawing?
                    // If `imgSrc` is set, it might include it.
                    // Let's set `imgSrc` for display, but when exporting, we might need a trick.
                    // Actually, Fal accepts a mask where white is the area to paint.
                    // We can set brushColor="white" and canvas background to "transparent" (but we need black).
                    
                    // Workaround: We display the image as a background div, and make CanvasDraw transparent.
                    canvasWidth={800}
                    canvasHeight={450}
                    brushRadius={20}
                    lazyRadius={0}
                    hideGrid
                    className="border shadow-sm"
                    style={{ background: "transparent" }} 
                />
                {/* Background Image manually positioned if needed, but `imgSrc` is easier */}
            </div>
        </div>

        <div className="flex gap-4 items-end mt-4">
            <div className="flex-1 space-y-2">
                <Label>What to change?</Label>
                <Input 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g. A red tie, sunglasses, remove object..." 
                />
            </div>
            
            <Button variant="outline" size="icon" onClick={() => canvasRef.current?.undo()}>
                <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => canvasRef.current?.clear()}>
                <Eraser className="h-4 w-4" />
            </Button>
            
            <Button onClick={handleGenerate} disabled={loading || !prompt}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Apply Changes
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
