"use client"

import { useState, useEffect } from "react"
import { Wand2, Trash2, Download, Loader2, Clock, Move, ChevronLeft, ChevronRight, Layers, Upload, X } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
import { AssetSelector } from "./AssetSelector"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StoryboardFrame as IStoryboardFrame, GeneratedImage, Asset } from "@/types"

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
        // If not base64 and not http(s) url, return as is
        if (!src) {
            resolve("");
            return;
        }

        const img = new Image();
        // IMPORTANT: Allow cross-origin for Vercel Blob / external images
        img.crossOrigin = "anonymous"; 
        
        // Timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            console.warn("Image load timeout, using original src");
            resolve(src);
        }, 5000);

        img.onload = () => {
            clearTimeout(timeoutId);
            try {
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
            } catch (e) {
                console.warn("Canvas compression failed (likely CORS), using original src", e);
                // Fallback to original URL if canvas fails (e.g. strict CORS)
                resolve(src);
            }
        };
        
        img.onerror = () => {
            clearTimeout(timeoutId);
            console.warn("Image load failed, using original src");
            resolve(src);
        };
        
        img.src = src;
    });
};

interface ShotControlsProps {
    type: "start" | "end"
    frame: IStoryboardFrame
    updateFrame: (id: string, updates: Partial<IStoryboardFrame>) => void
    assets: Asset[]
    loading: string | null
    onGenerate: (type: "start" | "end") => void
    selectedModels: string[]
    toggleModel: (id: string) => void
}

function ShotControls({ type, frame, updateFrame, assets, loading, onGenerate, selectedModels, toggleModel }: ShotControlsProps) {
    // Determine current values based on type, falling back to shared fields if specific ones are empty
    // But for editing, we always write to specific fields.
    
    // Helper to get value: Specific > Shared (Legacy)
    // Note: Once we edit "Start", it becomes specific.
    const script = type === 'start' ? (frame.startScript ?? frame.storyScript) : (frame.endScript ?? frame.storyScript)
    const actionNotes = type === 'start' ? (frame.startActionNotes ?? frame.actionNotes) : (frame.endActionNotes ?? frame.actionNotes)
    const characterIds = type === 'start' ? (frame.startCharacterIds ?? frame.characterIds) : (frame.endCharacterIds ?? frame.characterIds)
    const sceneId = type === 'start' ? (frame.startSceneId ?? frame.sceneId) : (frame.endSceneId ?? frame.sceneId)
    const customUploads = type === 'start' ? (frame.startCustomUploads ?? frame.customUploads) : (frame.endCustomUploads ?? frame.customUploads)

    const selectedCharacters = (characterIds || []).map(id => assets.find(a => a.id === id)).filter(Boolean)
    const selectedScene = assets.find(a => a.id === sceneId)

    const handleScriptChange = (val: string) => {
        const updates: any = {}
        if (type === 'start') {
            updates.startScript = val
            // Sync logic: If endScript is empty/undefined, update it too?
            // Or if endScript is same as old startScript?
            // Simple approach: If endScript is falsy, sync it.
            if (!frame.endScript) {
                updates.endScript = val
            }
        } else {
            updates.endScript = val
        }
        updateFrame(frame.id, updates)
    }
    
    // Similar sync logic for other fields could be added here
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
    
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const result = e.target?.result as string;
                if (result) {
                    const compressed = await compressImage(result, 640, 0.6);
                    const current = customUploads || [];
                    const updates: any = {};
                    const newUploads = [...current, compressed];
                    
                    if (type === 'start') {
                        updates.startCustomUploads = newUploads;
                        if (!frame.endCustomUploads || frame.endCustomUploads.length === 0) {
                             updates.endCustomUploads = newUploads;
                        }
                    } else {
                        updates.endCustomUploads = newUploads;
                    }
                    updateFrame(frame.id, updates);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeCustomUpload = (indexToRemove: number) => {
        const current = customUploads || [];
        const newUploads = current.filter((_, i) => i !== indexToRemove);
        if (type === 'start') updateFrame(frame.id, { startCustomUploads: newUploads });
        else updateFrame(frame.id, { endCustomUploads: newUploads });
    };

    return (
        <div className="space-y-4 py-2">
             {/* Assets */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Characters</label>
                  <AssetSelector 
                    type="character" 
                    value={characterIds} 
                    onChange={(v) => {
                        const val = Array.isArray(v) ? v : [v];
                        if (type === 'start') {
                            const updates: any = { startCharacterIds: val };
                            if (!frame.endCharacterIds || frame.endCharacterIds.length === 0) updates.endCharacterIds = val;
                            updateFrame(frame.id, updates);
                        } else {
                            updateFrame(frame.id, { endCharacterIds: val });
                        }
                    }} 
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
                    value={sceneId} 
                    onChange={(v) => {
                        const val = v === 'none' ? undefined : v as string;
                        if (type === 'start') {
                            const updates: any = { startSceneId: val };
                            if (!frame.endSceneId) updates.endSceneId = val;
                            updateFrame(frame.id, updates);
                        } else {
                            updateFrame(frame.id, { endSceneId: val });
                        }
                    }} 
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
                    {(!customUploads || customUploads.length === 0) && (
                        <div className="text-muted-foreground text-[10px] flex items-center justify-center w-full">
                            No custom images uploaded
                        </div>
                    )}
                    {customUploads?.map((url, i) => (
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Action Script</label>
                    <Textarea 
                        value={script || ""}
                        onChange={(e) => handleScriptChange(e.target.value)}
                        placeholder={`Describe action for ${type} shot...`}
                        className="min-h-[80px] resize-none"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center">
                        <Move className="h-3 w-3 mr-1" /> Camera & Movement
                    </label>
                    <Textarea 
                        value={actionNotes || ""}
                        onChange={(e) => {
                            const val = e.target.value;
                             if (type === 'start') {
                                const updates: any = { startActionNotes: val };
                                if (!frame.endActionNotes) updates.endActionNotes = val;
                                updateFrame(frame.id, updates);
                            } else {
                                updateFrame(frame.id, { endActionNotes: val });
                            }
                        }}
                        placeholder="Pan left, zoom in..."
                        className="min-h-[60px] resize-none bg-muted/30"
                    />
                </div>
            </div>

            {/* Generate Button (Specific to this shot) */}
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
                
                <Button 
                    onClick={() => onGenerate(type)} 
                    disabled={!!loading}
                    className="w-full"
                >
                    {loading === type ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Generate {type === 'start' ? 'Start' : 'End'} Shot
                </Button>
            </div>
        </div>
    )
}

export function StoryboardFrame({ frame, index }: StoryboardFrameProps) {
  const { updateFrame, deleteFrame, assets, addApiLog } = useStoryStore()
  const [loading, setLoading] = useState<"start" | "end" | "all" | null>(null)
  const [selectedModels, setSelectedModels] = useState<string[]>(MODEL_OPTIONS.map(m => m.id))
  const [editImage, setEditImage] = useState<{ url: string, type: "start" | "end" } | null>(null)
  const inpaintModelId = AI_MODELS.find(m => m.type === "inpainting")?.id

  const toggleModel = (modelId: string) => {
      if (selectedModels.includes(modelId)) {
          // Allow deselecting even the last one
          setSelectedModels(selectedModels.filter(m => m !== modelId))
      } else {
          setSelectedModels([...selectedModels, modelId])
      }
  }

  const generateImage = async (target: "start" | "end") => {
    // Get specific config
    const script = target === 'start' ? (frame.startScript ?? frame.storyScript) : (frame.endScript ?? frame.storyScript)
    const actionNotes = target === 'start' ? (frame.startActionNotes ?? frame.actionNotes) : (frame.endActionNotes ?? frame.actionNotes)
    const characterIds = target === 'start' ? (frame.startCharacterIds ?? frame.characterIds) : (frame.endCharacterIds ?? frame.characterIds)
    const sceneId = target === 'start' ? (frame.startSceneId ?? frame.sceneId) : (frame.endSceneId ?? frame.sceneId)
    const customUploads = target === 'start' ? (frame.startCustomUploads ?? frame.customUploads) : (frame.endCustomUploads ?? frame.customUploads)

    if (!script) {
        toast.error("Story script is required", {
            description: `Please enter a description for the ${target} shot.`
        })
        return
    }

    if (selectedModels.length === 0) {
        toast.error("No model selected", {
            description: "Please select at least one AI model to generate images."
        })
        setLoading(null)
        return
    }

    setLoading(target)
    
    try {
      // Resolve character references
      const characters = (characterIds || []).map(id => assets.find(a => a.id === id)).filter(Boolean)
      const scene = assets.find(a => a.id === sceneId)
      
      let fullPrompt = ""
      if (scene) fullPrompt += `[Scene: ${scene.name}, ${scene.description}] `
      
      if (characters.length > 0) {
        characters.forEach(char => {
            if (char) fullPrompt += `[Character: ${char.name}, ${char.description}] `
        })
      }
      
      const timeContext = target === "start" ? "Opening shot, start of action." : "Closing shot, end of action."
      fullPrompt += `Action: ${script}. ${actionNotes || ""}. ${timeContext} Masterpiece, cinematic lighting, 8k.`

      // Gather all reference images
      const referenceImages: string[] = [];
      
      // 1. Scene Image
      if (scene?.imageUrl) {
          referenceImages.push(scene.imageUrl);
      }
      
      // 2. Character Images
      characters.forEach(char => {
          if (char?.imageUrl) referenceImages.push(char.imageUrl);
      });

      // 3. Custom Uploads
      if (customUploads && customUploads.length > 0) {
          referenceImages.push(...customUploads);
      }

      // Optimize payload: Compress all images before sending
      const optimizedImages = await Promise.all(referenceImages.map(img => compressImage(img, 640, 0.6)));
      
      console.log(`[Generate ${target}] Collecting images: ${referenceImages.length} raw -> ${optimizedImages.length} optimized`);

      // Parallel requests for each selected model
      const requests = selectedModels.map(async (modelId) => {
          const startTime = Date.now();
          try {
            const modelConfig = MODEL_OPTIONS.find(m => m.id === modelId);
            
            // Validation for Image-to-Image models
            if (modelConfig?.type === 'image-to-image' && optimizedImages.length === 0) {
                 if (modelId === 'jimeng-v4.5' || modelConfig.id.includes('jimeng')) {
                     // Allow fallback
                 } else {
                     throw new Error(`Model ${modelConfig.name} requires reference images.`);
                 }
            }

            const payload = {
                prompt: fullPrompt,
                mode: optimizedImages.length > 0 ? "image-to-image" : "text-to-image",
                aspect_ratio: "16:9",
                modelId, 
                imageUrl: optimizedImages[0], 
                imageUrls: optimizedImages 
            };

            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            let data;
            if (!res.ok) {
                // ... error handling (simplified)
                data = await res.json().catch(() => ({}));
                throw new Error(data.error || `API Error ${res.status}`);
            } else {
                data = await res.json();
            }
            
            // Log success if completed immediately (sync)
            if (data && data.status === "COMPLETED") {
                 addApiLog({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    endpoint: `/api/generate`,
                    modelId,
                    status: res.status,
                    duration: Date.now() - startTime,
                    requestPayload: payload,
                    responseBody: data
                });
            }
            
            return { ...data, modelId, startTime, requestPayload: payload }
          } catch (e: any) {
              console.error(`Model ${modelId} failed`, e)
              addApiLog({
                  id: crypto.randomUUID(),
                  timestamp: Date.now(),
                  endpoint: `/api/generate`,
                  modelId,
                  status: 500, // Approximate
                  duration: Date.now() - startTime,
                  error: e.message,
                  requestPayload: { prompt: fullPrompt, modelId, imageCount: optimizedImages.length }
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
              
              setLoading(null);
              return; 
          }

          const pollInterval = setInterval(async () => {
            try {
                const statusRes = await fetch(`/api/generate?id=${result.request_id}&endpoint=${encodeURIComponent(result.endpoint)}&modelId=${result.modelId}`)
                const data = await statusRes.json()
                
                if (data.status === "COMPLETED") {
                    clearInterval(pollInterval)
                    
                    addApiLog({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        endpoint: `/api/generate`,
                        modelId: result.modelId,
                        status: 200,
                        duration: Date.now() - result.startTime,
                        requestPayload: result.requestPayload,
                        responseBody: data
                    });
                    
                    const newImagesRaw = data.images || [];
                    if (newImagesRaw.length === 0) return; 

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
                    setLoading(null) // Ensure loading is cleared on error too
                }
            } catch (e) {
                clearInterval(pollInterval)
            }
          }, 2000)
      })

    } catch (e: any) {
      setLoading(null)
      toast.error("Generation failed", { description: e.message })
    }
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
          
          const updates: any = {};
          if (targetType === "start") {
              updates.selectedStartImageId = image.id;
              updates.startImageUrl = image.url;
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
  const uniqueImages = Array.from(new Map(allImages.map(item => [item.id, item])).values());
  
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
        
        <Tabs defaultValue="start" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="start">Start Shot</TabsTrigger>
            <TabsTrigger value="end">End Shot</TabsTrigger>
          </TabsList>
          
          <TabsContent value="start">
            <ShotControls 
                type="start"
                frame={frame}
                updateFrame={updateFrame}
                assets={assets}
                loading={loading}
                onGenerate={generateImage}
                selectedModels={selectedModels}
                toggleModel={toggleModel}
            />
          </TabsContent>
          
          <TabsContent value="end">
            <ShotControls 
                type="end"
                frame={frame}
                updateFrame={updateFrame}
                assets={assets}
                loading={loading}
                onGenerate={generateImage}
                selectedModels={selectedModels}
                toggleModel={toggleModel}
            />
          </TabsContent>
        </Tabs>
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
