"use client"

import { useEffect, useState } from "react"
import { useStoryStore } from "@/lib/story-store"
import { ImageStorage } from "@/lib/image-storage"
import { CreateAssetDialog } from "./CreateAssetDialog"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function AssetCard({ asset }: { asset: any }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const { deleteAsset } = useStoryStore()

  useEffect(() => {
    if (asset.imageKeys && asset.imageKeys.length > 0) {
      ImageStorage.get(asset.imageKeys[0]).then(setImageUrl)
    }
  }, [asset.imageKeys])

  return (
    <Card className="relative overflow-hidden group">
      <div className="aspect-square w-full bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={asset.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <CardContent className="p-2">
        <h3 className="truncate text-sm font-semibold">{asset.name}</h3>
        <p className="truncate text-xs text-muted-foreground">{asset.type}</p>
      </CardContent>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
         <Button 
            variant="destructive" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => deleteAsset(asset.id)}
         >
            <Trash2 className="h-3 w-3" />
         </Button>
      </div>
    </Card>
  )
}

export function AssetLibrary() {
  const { assets } = useStoryStore()
  
  const characters = assets.filter(a => a.type === 'character')
  const scenes = assets.filter(a => a.type === 'scene')

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/10">
      <div className="p-4 border-b">
        <h2 className="mb-2 font-semibold">Asset Library</h2>
        <CreateAssetDialog />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Characters ({characters.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {characters.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Scenes ({scenes.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {scenes.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
