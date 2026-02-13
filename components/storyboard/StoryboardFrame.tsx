"use client"

import { useState } from "react"
import { Wand2, Trash2, Download, Loader2, Clock, Move, ChevronLeft, ChevronRight, Layers, Upload, X } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
import { AssetSelector } from "./AssetSelector"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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

// Helper to compress base64 images
const compressImage = (src: string, maxDim = 640, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
        // If not base64, return as is (URL)
        if (!src.startsWith("data:image")) {
            resolve(src);
            return;
        }

        const img = new Image();
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            
            // Always resize if larger than maxDim
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(src);
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            
            // Re-encode with lower quality
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(dataUrl);
        };
        img.onerror = () => resolve(src);
    });
};

export function StoryboardFrame({ frame, index }: StoryboardFrameProps) {
  const { updateFrame, deleteFrame, assets, addApiLog } = useStoryStore()
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert files to Base64/DataURL and RESIZE
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const result = e.target?.result as string;
            if (result) {
                // Compress immediately on upload
                const compressed = await compressImage(result, 640, 0.6);
                const currentUploads = useStoryStore.getState().frames.find(f => f.id === frame.id)?.customUploads || [];
                updateFrame(frame.id, { customUploads: [...currentUploads, compressed] });
            }
        };
        reader.readAsDataURL(file);
    });
  };

  const removeCustomUpload = (indexToRemove: number) => {
      const currentUploads = frame.customUploads || [];
      const newUploads = currentUploads.filter((_, i) => i !== indexToRemove);
      updateFrame(frame.id, { customUploads: newUploads });
  };

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

      // Gather all reference images
      const referenceImages: string[] = [];
      
      // 1. Scene Image
      if (selectedScene?.imageUrl) {
          referenceImages.push(selectedScene.imageUrl);
      }
      
      // 2. Character Images
      selectedCharacters.forEach(char => {
          if (char?.imageUrl) referenceImages.push(char.imageUrl);
      });

      // 3. Custom Uploads
      if (frame.customUploads && frame.customUploads.length > 0) {
          referenceImages.push(...frame.customUploads);
      }

      // Optimize payload: Compress all images before sending
      // This ensures even older/larger images are compressed to fit Vercel limits
      const optimizedImages = await Promise.all(referenceImages.map(img => compressImage(img, 640, 0.6)));

      // Parallel requests for each selected model
      const requests = selectedModels.map(async (modelId) => {
          const startTime = Date.now();
          try {
            // Check if model is image-to-image and add imageUrl
            const modelConfig = MODEL_OPTIONS.find(m => m.id === modelId);
            
            // Validation for Image-to-Image models
            if (modelConfig?.type === 'image-to-image') {
                if (optimizedImages.length === 0) {
                    throw new Error(`Model ${modelConfig.name} is an Image-to-Image model and requires a reference image. Please select a Scene, Character, or upload a custom image.`);
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
                    imageUrl: optimizedImages[0], // Pass first image for backward compatibility / single-image models
                    imageUrls: optimizedImages // Pass all images for multi-reference models (e.g. Jimeng)
                })
            })

            let data;
            if (!res.ok) {
                // Try to parse JSON error, fallback to text
                const text = await res.text();
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { error: text || res.statusText };
                }
                
                // If 413, explicit message
                if (res.status === 413) {
                     throw new Error("Payload too large. Please reduce the number of images or use smaller files.");
                }
                
                throw new Error(data.error || data.message || `API Error ${res.status}`);
            } else {
                data = await res.json();
            }
            
            return { ...data, modelId, startTime }
          } catch (e: any) {
              console.error(`Model ${modelId} failed`, e)
              addApiLog({
                  id: crypto.randomUUID(),
                  timestamp: Date.now(),
                  endpoint: `/api/generate`,
                  modelId,
                  status: 500, // Approximate
                  duration: Date.now() - startTime,
                  error: e.message
              });
              return { error: e.message, modelId }
          }
      })

      const results = await Promise.all(requests)
      const validResults = results.filter(r => r && !r.error)
      const errors = results.filter(r => r && r.error).map(r => `${r.modelId}: ${r.error}`)

      if (validResults.length === 0) {
          throw new Error(`All model generations failed.\n${errors.join('\n')}`)
      }

      // Poll for each request
      validResults.forEach(async (result) => {
          // Check if already completed (Sync API like Jimeng Ark)
          if (result.status === "COMPLETED" && result.images && result.images.length > 0) {
              const newImagesRaw = result.images;
              const newGeneratedImages: GeneratedImage[] = newImagesRaw.map((img: any) => ({
                  id: crypto.randomUUID(),
                  url: img.url,
                  modelId: result.modelId,
                  timestamp: Date.now()
              }));

              const firstNewImage = newGeneratedImages[0];
              
              // We use getState to get fresh data
              const freshFrame = useStoryStore.getState().frames.find(f => f.id === frame.id)
              if (!freshFrame) return

              if (target === "start") {
                  updateFrame(frame.id, { 
                      startImages: [...(freshFrame.startImages || []), ...newGeneratedImages],
                      selectedStartImageId: firstNewImage.id,
                      startImageUrl: firstNewImage.url
                  })
              } else {
                  updateFrame(frame.id, { 
                      endImages: [...(freshFrame.endImages || []), ...newGeneratedImages],
                      selectedEndImageId: firstNewImage.id,
                      endImageUrl: firstNewImage.url
                  })
              }
              
              // Log success for sync response
              addApiLog({
                  id: crypto.randomUUID(),
                  timestamp: Date.now(),
                  endpoint: `/api/generate`,
                  modelId: result.modelId,
                  status: 200,
                  duration: Date.now() - result.startTime, // approximate
              });

              setLoading(null);
              return; // Skip polling
          }

          const pollInterval = setInterval(async () => {
            try {
                const statusRes = await fetch(`/api/generate?id=${result.request_id}&endpoint=${encodeURIComponent(result.endpoint)}&modelId=${result.modelId}`)
                const data = await statusRes.json()
                
                if (data.status === "COMPLETED") {
                    clearInterval(pollInterval)
                    
                    // Log success
                    addApiLog({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        endpoint: `/api/generate`,
                        modelId: result.modelId,
                        status: 200,
                        duration: Date.now() - result.startTime,
                    });
                    
                    // Handle array of images or single image
                    const newImagesRaw = data.images || [];
                    if (newImagesRaw.length === 0) return; // Should not happen if completed

                    // We use getState to get fresh data
                    const freshFrame = useStoryStore.getState().frames.find(f => f.id === frame.id)
                    if (!freshFrame) return

                    const newGeneratedImages: GeneratedImage[] = newImagesRaw.map((img: any) => ({
                        id: crypto.randomUUID(),
                        url: img.url,
                        modelId: result.modelId,
                        timestamp: Date.now()
                    }));

                    const firstNewImage = newGeneratedImages[0];

                    if (target === "start") {
                        updateFrame(frame.id, { 
                            startImages: [...(freshFrame.startImages || []), ...newGeneratedImages],
                            selectedStartImageId: firstNewImage.id, // Auto select latest
                            startImageUrl: firstNewImage.url // Legacy
                        })
                    } else {
                        updateFrame(frame.id, { 
                            endImages: [...(freshFrame.endImages || []), ...newGeneratedImages],
                            selectedEndImageId: firstNewImage.id, // Auto select latest
                            endImageUrl: firstNewImage.url // Legacy
                        })
                    }
                    
                    setLoading(null)

                } else if (data.status === "FAILED") {
                    clearInterval(pollInterval)
                    addApiLog({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        endpoint: `/api/generate`,
                        modelId: result.modelId,
                        status: 500,
                        duration: Date.now() - result.startTime,
                        error: data.error || "Async Generation Failed"
                    });
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

  // --- Drag & Drop Logic ---
  const handleDragStart = (e: React.DragEvent, image: GeneratedImage) => {
      e.dataTransfer.setData("application/json", JSON.stringify(image));
      e.dataTransfer.effectAllowed = "copy";
  }

  const handleDrop = (e: React.DragEvent, targetType: "start" | "end") => {
      e.preventDefault();
      try {
          const data = e.dataTransfer.getData("application/json");
          if (!data) return;
          const image = JSON.parse(data) as GeneratedImage;
          
          // Update the specific slot with this image
          // We also ensure this image exists in the respective history array if dragged from the other side
          // But for simplicity, we just update the selected ID and URL. 
          // If we want to strictly keep history clean, we might add it to the target history array too.
          
          const updates: any = {};
          if (targetType === "start") {
              updates.selectedStartImageId = image.id;
              updates.startImageUrl = image.url;
              // Optional: Add to startImages if not present?
              // Let's just update the selection for now.
          } else {
              updates.selectedEndImageId = image.id;
              updates.endImageUrl = image.url;
          }
          updateFrame(frame.id, updates);
      } catch (err) {
          console.error("Drop failed", err);
      }
  }

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
  }

  // --- Group Images by Model ---
  const allImages = [...(frame.startImages || []), ...(frame.endImages || [])];
  // Deduplicate by ID
  const uniqueImages = Array.from(new Map(allImages.map(item => [item.id, item])).values());
  
  // Group by Model ID
  const imagesByModel: Record<string, GeneratedImage[]> = {};
  uniqueImages.forEach(img => {
      const modelId = img.modelId || 'unknown';
      if (!imagesByModel[modelId]) imagesByModel[modelId] = [];
      imagesByModel[modelId].push(img);
  });

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-6 border-b hover:bg-muted/5 transition-colors">
      {editImage && inpaintModelId && (
        <InpaintingEditor 
            open={!!editImage} 
            imageUrl={editImage.url} 
            onClose={() => setEditImage(null)} 
            onSave={handleSaveEdit}
            modelId={inpaintModelId}
        />
      )}
      
      {/* Index Number */}
      <div className="flex-none w-8 pt-1 text-center font-bold text-muted-foreground/50 text-xl hidden xl:block">
        {index + 1}
      </div>
      
      {/* Left Column: Controls & Script */}
      <div className="flex-1 space-y-4 min-w-[300px]">
        <div className="xl:hidden font-bold text-muted-foreground mb-2">Frame {index + 1}</div>
        
        {/* Top Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Characters</label>
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
                      <img src={char.imageUrl} alt={char.name} className="h-6 w-6 rounded-full object-cover border" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-muted text-[10px] flex items-center justify-center border">
                        {char.name?.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">{char.name}</span>
                  </div>
                ))}
              </div>
           </div>
           <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Scene</label>
              <AssetSelector 
                type="scene" 
                value={frame.sceneId} 
                onChange={(v) => updateFrame(frame.id, { sceneId: v === 'none' ? undefined : v as string })} 
              />
              {selectedScene && (
                <div className="mt-2 flex items-center gap-2">
                  {selectedScene.imageUrl ? (
                    <img src={selectedScene.imageUrl} alt={selectedScene.name} className="h-6 w-6 rounded-full object-cover border" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted text-[10px] flex items-center justify-center border">
                      {selectedScene.name?.slice(0, 1)}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">{selectedScene.name}</span>
                </div>
              )}
           </div>
        </div>

        {/* Custom Uploads */}
        <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center justify-between">
                <span>Custom Reference Images</span>
                <label className="cursor-pointer text-primary hover:underline text-[10px] flex items-center">
                    <Upload className="h-3 w-3 mr-1" /> Upload
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                </label>
            </label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted/20 rounded-md border border-dashed">
                {(!frame.customUploads || frame.customUploads.length === 0) && (
                    <div className="text-muted-foreground text-[10px] flex items-center justify-center w-full">
                        No custom images uploaded
                    </div>
                )}
                {frame.customUploads?.map((url, i) => (
                    <div key={i} className="relative group w-10 h-10 rounded overflow-hidden border">
                        <img src={url} className="w-full h-full object-cover" />
                        <button 
                            onClick={() => removeCustomUpload(i)}
                            className="absolute top-0 right-0 bg-black/50 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* Script Area */}
        <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Story Script</label>
                <Textarea 
                    value={frame.storyScript}
                    onChange={(e) => updateFrame(frame.id, { storyScript: e.target.value })}
                    placeholder="Describe action..."
                    className="min-h-[80px] resize-none"
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
                    className="min-h-[60px] resize-none bg-muted/30"
                />
            </div>
        </div>

        {/* Model Selection & Generate */}
        <div className="flex flex-col gap-3 bg-muted/10 p-3 rounded-lg border border-dashed">
            <div className="flex flex-wrap gap-1 items-center">
                <Layers className="h-4 w-4 text-muted-foreground mr-2" />
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
            
            <div className="flex gap-2 w-full">
                <Button 
                    onClick={handleGenerateAll} 
                    disabled={!!loading}
                    size="sm"
                    className="bg-primary/90 hover:bg-primary flex-1"
                >
                    {loading === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Generate All
                </Button>
                <Button variant="outline" size="sm" onClick={() => generateImage("start")} disabled={!!loading}>Start</Button>
                <Button variant="outline" size="sm" onClick={() => generateImage("end")} disabled={!!loading}>End</Button>
            </div>
        </div>
      </div>

      {/* Right Column: Preview & History */}
      <div className="flex-none w-full xl:w-[400px] flex flex-col gap-4">
        
        {/* Drop Zones (Final Preview) */}
        <div className="grid grid-cols-2 gap-4">
            {/* Start Frame Slot */}
            <div 
                className="space-y-1"
                onDrop={(e) => handleDrop(e, "start")}
                onDragOver={handleDragOver}
            >
                <div className="text-xs font-semibold text-muted-foreground text-center uppercase">Start Frame</div>
                <div className={cn(
                    "aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative overflow-hidden bg-muted/20 transition-all",
                    frame.startImageUrl ? "border-solid border-green-500/50" : "hover:border-primary/50"
                )}>
                    {frame.startImageUrl ? (
                        <>
                            <img src={frame.startImageUrl} alt="Start" className="w-full h-full object-cover" />
                            <div className="absolute bottom-1 right-1 flex gap-1">
                                <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full opacity-80 hover:opacity-100" onClick={() => window.open(frame.startImageUrl, '_blank')}>
                                    <Download className="h-3 w-3" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-2 text-muted-foreground text-xs pointer-events-none">
                            {loading === 'start' ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Drag image here"}
                        </div>
                    )}
                </div>
            </div>

            {/* End Frame Slot */}
            <div 
                className="space-y-1"
                onDrop={(e) => handleDrop(e, "end")}
                onDragOver={handleDragOver}
            >
                <div className="text-xs font-semibold text-muted-foreground text-center uppercase">End Frame</div>
                <div className={cn(
                    "aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative overflow-hidden bg-muted/20 transition-all",
                    frame.endImageUrl ? "border-solid border-green-500/50" : "hover:border-primary/50"
                )}>
                    {frame.endImageUrl ? (
                        <>
                            <img src={frame.endImageUrl} alt="End" className="w-full h-full object-cover" />
                            <div className="absolute bottom-1 right-1 flex gap-1">
                                <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full opacity-80 hover:opacity-100" onClick={() => window.open(frame.endImageUrl, '_blank')}>
                                    <Download className="h-3 w-3" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-2 text-muted-foreground text-xs pointer-events-none">
                            {loading === 'end' ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Drag image here"}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Generation History (Draggable Source) */}
        <div className="flex-1 bg-muted/10 rounded-lg p-3 border overflow-hidden flex flex-col min-h-[300px]">
            <div className="text-xs font-semibold text-muted-foreground mb-3 flex justify-between items-center">
                <span>Generation History</span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{uniqueImages.length} images</span>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-1 space-y-4 scrollbar-thin">
                {uniqueImages.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground/50">
                        No images generated yet.
                    </div>
                ) : (
                    Object.entries(imagesByModel).map(([modelId, images]) => (
                        <div key={modelId} className="space-y-2">
                            <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <div className="h-px bg-border flex-1" />
                                {MODEL_OPTIONS.find(m => m.id === modelId)?.name || modelId}
                                <div className="h-px bg-border flex-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {images.map(img => (
                                    <div 
                                        key={img.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, img)}
                                        className="relative aspect-video rounded-md overflow-hidden border bg-background cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/50 transition-all group"
                                    >
                                        <img src={img.url} className="w-full h-full object-cover" />
                                        
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {inpaintModelId && (
                                                <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => setEditImage({ url: img.url, type: "start" })}>
                                                    <Wand2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => window.open(img.url, '_blank')}>
                                                <Download className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  )
}
