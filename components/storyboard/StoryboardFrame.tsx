"use client"

import { useState } from "react"
import { Wand2, Trash2, Download, Loader2, Clock, Move, ChevronLeft, ChevronRight, Layers } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
import { AssetSelector } from "./AssetSelector"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { StoryboardFrame as IStoryboardFrame, GeneratedImage } from "@/types"

import { InpaintingEditor } from "./InpaintingEditor"
import { AI_MODELS } from "@/lib/ai-models"

interface StoryboardFrameProps {
  frame: IStoryboardFrame
  index: number
}

// Model Selection Options - Filter for text-to-image and image-to-image models
const MODEL_OPTIONS = AI_MODELS.filter(m => m.type === 'text-to-image' || m.type === 'image-to-image');

export function StoryboardFrame({ frame, index }: StoryboardFrameProps) {
  const { updateFrame, deleteFrame, assets } = useStoryStore()
  const [loading, setLoading] = useState<"start" | "end" | "all" | null>(null)
  const [selectedModels, setSelectedModels] = useState<string[]>(MODEL_OPTIONS.map(m => m.id))
  const [editImage, setEditImage] = useState<{ url: string, type: "start" | "end" } | null>(null)

  const selectedCharacters = (frame.characterIds || [])
    .map(id => assets.find(a => a.id === id))
    .filter(Boolean)
  const selectedScene = assets.find(a => a.id === frame.sceneId)
  const inpaintModelId = AI_MODELS.find(m => m.type === "inpainting")?.id

  const toggleModel = (modelId: string) => {
      if (selectedModels.includes(modelId)) {
          if (selectedModels.length > 1) {
              setSelectedModels(selectedModels.filter(m => m !== modelId))
          }
      } else {
          setSelectedModels([...selectedModels, modelId])
      }
  }

  const generateImage = async (target: "start" | "end") => {
    if (!frame.storyScript) {
        alert("Please enter a story script")
        return
    }

    setLoading(target)
    
    try {
      // Resolve character references
      const characters = (frame.characterIds || []).map(id => assets.find(a => a.id === id)).filter(Boolean)
      const scene = assets.find(a => a.id === frame.sceneId)
      
      let fullPrompt = ""
      if (scene) fullPrompt += `[Scene: ${scene.name}, ${scene.description}] `
      
      if (characters.length > 0) {
        characters.forEach(char => {
            if (char) fullPrompt += `[Character: ${char.name}, ${char.description}] `
        })
      }
      
      const timeContext = target === "start" ? "Opening shot, start of action." : "Closing shot, end of action."
      fullPrompt += `Action: ${frame.storyScript}. ${frame.actionNotes || ""}. ${timeContext} Masterpiece, cinematic lighting, 8k.`

      // Parallel requests for each selected model
      const requests = selectedModels.map(async (modelId) => {
          try {
            // Check if model is image-to-image and add imageUrl
            const modelConfig = MODEL_OPTIONS.find(m => m.id === modelId);
            let imageUrl = undefined;
            if (modelConfig?.type === 'image-to-image') {
                // Determine source image: For 'start', we might use scene or character reference?
                // Or maybe previous frame's end image?
                // Requirement says: "参考的image是资产库里面的角色和环境"
                // But typically img2img needs a single composite input or controlnet.
                // For simple img2img, we might pick the Scene image as base.
                if (selectedScene?.imageUrl) {
                    imageUrl = selectedScene.imageUrl;
                }
                // If no scene image, maybe first character?
                else if (selectedCharacters.length > 0 && selectedCharacters[0] && selectedCharacters[0].imageUrl) {
                    imageUrl = selectedCharacters[0].imageUrl;
                }
            }

            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: fullPrompt,
                    mode: "text-to-image", // Backend ignores this mostly, uses modelId
                    aspect_ratio: "16:9",
                    modelId, // Pass model ID to backend
                    imageUrl // Pass imageUrl if available
                })
            })
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            return { ...data, modelId }
          } catch (e) {
              console.error(`Model ${modelId} failed`, e)
              return null
          }
      })

      const results = await Promise.all(requests)
      const validResults = results.filter(Boolean)

      if (validResults.length === 0) {
          throw new Error("All model generations failed")
      }

      // Poll for each request
      validResults.forEach(async (result) => {
          const pollInterval = setInterval(async () => {
            try {
                const statusRes = await fetch(`/api/generate?id=${result.request_id}&endpoint=${encodeURIComponent(result.endpoint)}&modelId=${result.modelId}`)
                const data = await statusRes.json()
                
                if (data.status === "COMPLETED") {
                    clearInterval(pollInterval)
                    const imageUrl = data.images[0].url
                    
                    const newImage: GeneratedImage = {
                        id: crypto.randomUUID(),
                        url: imageUrl,
                        modelId: result.modelId,
                        timestamp: Date.now()
                    }

                    // Functional update to avoid closure staleness if multiple models finish
                    // Note: In React state, we'd use setState(prev => ...). 
                    // Zustand's updateFrame merges updates. We need to be careful about race conditions with multiple async updates.
                    // For now, we just read the latest state from store inside the component via props? No, props update on render.
                    // We rely on Zustand's `set` being synchronous-like in memory, but here we call `updateFrame`.
                    // To be safe, we should probably read the fresh frame from store if possible, but we don't have direct access here.
                    // A simple workaround: We append to the array. 
                    // Actually, we need to pass a function to updateFrame if it supported it, but our store implementation takes partial state.
                    
                    // Let's assume low concurrency collision for MVP or just append.
                    // To fix race condition properly, we'd need to change store to accept a callback.
                    // For now, let's just push.
                    
                    // We fetch the latest frame state implicitly by using the closure? No that's stale.
                    // We will use a functional update pattern if we change store. 
                    // As is, `updateFrame` replaces state. This IS a race condition risk with multiple models.
                    // Quick fix: We can't easily fix without changing store.
                    // Let's just hope they don't finish EXACTLY at the same millisecond.
                    
                    // Better approach: We can use `useStoryStore.getState().frames` to get fresh data before writing.
                    const freshFrame = useStoryStore.getState().frames.find(f => f.id === frame.id)
                    if (!freshFrame) return

                    if (target === "start") {
                        updateFrame(frame.id, { 
                            startImages: [...(freshFrame.startImages || []), newImage],
                            selectedStartImageId: newImage.id, // Auto select latest
                            startImageUrl: imageUrl // Legacy
                        })
                    } else {
                        updateFrame(frame.id, { 
                            endImages: [...(freshFrame.endImages || []), newImage],
                            selectedEndImageId: newImage.id, // Auto select latest
                            endImageUrl: imageUrl // Legacy
                        })
                    }
                    
                    // If this was the last one, stop loading (simplified logic: stop loading when ANY finishes? No, when ALL finish?)
                    // It's hard to track "all finished" inside async loop without a counter.
                    // We'll just set loading to null after a timeout or when the main loop exits?
                    // Actually, we can't easily know when *all* are done here.
                    // Let's just set loading to null when the *first* one succeeds so user sees something.
                    setLoading(null)

                } else if (data.status === "FAILED") {
                    clearInterval(pollInterval)
                }
            } catch (e) {
                clearInterval(pollInterval)
            }
          }, 2000)
      })

    } catch (e: any) {
      setLoading(null)
      alert(e.message || "Error starting generation")
    }
  }

  const handleGenerateAll = async () => {
      setLoading("all")
      await Promise.all([generateImage("start"), generateImage("end")])
      // Loading state is handled inside generateImage mostly, but "all" might need coordination.
      // We rely on the internal logic to clear loading.
  }
  
  const handleSaveEdit = (newUrl: string) => {
      if (!editImage) return
      
      const type = editImage.type
      const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          url: newUrl,
          modelId: "inpainting",
          timestamp: Date.now()
      }
      
      const freshFrame = useStoryStore.getState().frames.find(f => f.id === frame.id)
      if (!freshFrame) return

      if (type === "start") {
          updateFrame(frame.id, { 
              startImages: [...(freshFrame.startImages || []), newImage],
              selectedStartImageId: newImage.id,
              startImageUrl: newUrl
          })
      } else {
          updateFrame(frame.id, { 
              endImages: [...(freshFrame.endImages || []), newImage],
              selectedEndImageId: newImage.id,
              endImageUrl: newUrl
          })
      }
  }

  const ImageCarousel = ({ type }: { type: "start" | "end" }) => {
      const images = type === "start" ? frame.startImages : frame.endImages
      const selectedId = type === "start" ? frame.selectedStartImageId : frame.selectedEndImageId
      
      if (!images || images.length === 0) {
          return (
            <Card className="h-[160px] w-full bg-muted/20 flex items-center justify-center border-dashed">
                <div className="text-xs text-muted-foreground text-center p-4">
                    {loading === type || loading === "all" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "No Images"}
                </div>
            </Card>
          )
      }

      return (
          <div className="w-full max-w-[280px]">
             <Carousel className="w-full">
                <CarouselContent>
                    {images.map((img) => (
                        <CarouselItem key={img.id}>
                            <div className="p-1">
                                <Card className={`relative overflow-hidden aspect-video group ${selectedId === img.id ? 'ring-2 ring-primary' : ''}`}>
                                    <img src={img.url} alt="Generated" className="object-cover w-full h-full" />
                                    <div className="absolute top-1 left-1">
                                        <Badge variant="secondary" className="text-[10px] opacity-70">{img.modelId.replace('fal-', '')}</Badge>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-white hover:text-green-400"
                                                onClick={() => updateFrame(frame.id, type === "start" ? { selectedStartImageId: img.id, startImageUrl: img.url } : { selectedEndImageId: img.id, endImageUrl: img.url })}
                                            >
                                                {selectedId === img.id ? <div className="h-2 w-2 rounded-full bg-green-500" /> : "Select"}
                                            </Button>
                                            {inpaintModelId && (
                                              <Button
                                                  variant="ghost" 
                                                  size="icon"
                                                  className="h-6 w-6 text-white hover:text-yellow-400"
                                                  onClick={() => setEditImage({ url: img.url, type })}
                                              >
                                                  <Wand2 className="h-3 w-3" />
                                              </Button>
                                            )}
                                        </div>
                                        <a href={img.url} target="_blank" download className="text-white hover:text-blue-400">
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </div>
                                </Card>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
             </Carousel>
             <div className="text-center mt-1 text-[10px] text-muted-foreground">
                {images.length} version{images.length > 1 ? 's' : ''} • {type.toUpperCase()}
             </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 border-b hover:bg-muted/5 transition-colors">
      {editImage && inpaintModelId && (
        <InpaintingEditor 
            open={!!editImage} 
            imageUrl={editImage.url} 
            onClose={() => setEditImage(null)} 
            onSave={handleSaveEdit}
            modelId={inpaintModelId}
        />
      )}
      <div className="flex-none w-8 pt-1 text-center font-bold text-muted-foreground/50 text-xl">
        {index + 1}
      </div>
      
      <div className="flex-1 space-y-4">
        {/* Top Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Characters</label>
              <AssetSelector 
                type="character" 
                value={frame.characterIds} 
                onChange={(v) => updateFrame(frame.id, { characterIds: Array.isArray(v) ? v : [v] })} 
                multi
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCharacters.map((char: any) => (
                  <div key={char.id} className="flex items-center gap-2">
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} className="h-7 w-7 rounded-full object-cover border" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted text-[10px] flex items-center justify-center border">
                        {char.name?.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">{char.name}</span>
                  </div>
                ))}
              </div>
           </div>
           <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Scene</label>
              <AssetSelector 
                type="scene" 
                value={frame.sceneId} 
                onChange={(v) => updateFrame(frame.id, { sceneId: v === 'none' ? undefined : v as string })} 
              />
              {selectedScene && (
                <div className="mt-2 flex items-center gap-2">
                  {selectedScene.imageUrl ? (
                    <img src={selectedScene.imageUrl} alt={selectedScene.name} className="h-7 w-7 rounded-full object-cover border" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-muted text-[10px] flex items-center justify-center border">
                      {selectedScene.name?.slice(0, 1)}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">{selectedScene.name}</span>
                </div>
              )}
           </div>
           <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Duration (s)</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    type="number"
                    value={frame.duration || 3}
                    onChange={(e) => updateFrame(frame.id, { duration: parseInt(e.target.value) })}
                    className="pl-9"
                    min={1}
                    max={10}
                />
              </div>
           </div>
        </div>

        {/* Script Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Story Script</label>
                <Textarea 
                    value={frame.storyScript}
                    onChange={(e) => updateFrame(frame.id, { storyScript: e.target.value })}
                    placeholder="Describe action... Use @CharacterName to reference."
                    className="min-h-[100px] resize-none"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center">
                    <Move className="h-3 w-3 mr-1" /> Camera & Movement
                </label>
                <Textarea 
                    value={frame.actionNotes || ""}
                    onChange={(e) => updateFrame(frame.id, { actionNotes: e.target.value })}
                    placeholder="Pan left, zoom in..."
                    className="min-h-[100px] resize-none bg-muted/30"
                />
            </div>
        </div>

        {/* Model Selection & Generate */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/10 p-3 rounded-lg border border-dashed">
            <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Models:</span>
                <div className="flex flex-wrap gap-1">
                    {MODEL_OPTIONS.map(model => (
                        <Badge 
                            key={model.id}
                            variant={selectedModels.includes(model.id) ? "default" : "outline"}
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => toggleModel(model.id)}
                        >
                            {model.name}
                        </Badge>
                    ))}
                </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                    onClick={handleGenerateAll} 
                    disabled={!!loading}
                    size="sm"
                    className="bg-primary/90 hover:bg-primary flex-1 sm:flex-none"
                >
                    {loading === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Generate Both
                </Button>
                <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => generateImage("start")}
                    disabled={!!loading}
                >
                    Start
                </Button>
                <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => generateImage("end")}
                    disabled={!!loading}
                >
                    End
                </Button>
            </div>
        </div>
      </div>

      {/* Result Carousels */}
      <div className="flex-none flex flex-col gap-4 justify-center min-w-[280px]">
        <ImageCarousel type="start" />
        <ImageCarousel type="end" />
      </div>
    </div>
  )
}
