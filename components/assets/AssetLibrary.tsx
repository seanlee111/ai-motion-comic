"use client"

import { useEffect, useState } from "react"
import { useStoryStore } from "@/lib/story-store"
import { CreateAssetDialog } from "./CreateAssetDialog"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditAssetDialog } from "./EditAssetDialog"

function AssetCard({ asset }: { asset: any }) {
  const { deleteAsset } = useStoryStore()

  const coverImage = asset.imageUrls?.[0] || asset.imageUrl;
  const count = asset.imageUrls?.length || (asset.imageUrl ? 1 : 0);

  return (
    <Card className="relative overflow-hidden group border-0 bg-transparent shadow-none hover:bg-muted/50 transition-colors rounded-lg">
      <EditAssetDialog
        asset={asset}
        trigger={
          <div className="aspect-[3/4] w-full bg-muted rounded-md overflow-hidden relative cursor-pointer border border-border/50 hover:border-primary/50 transition-colors">
            {coverImage ? (
              <img src={coverImage} alt={asset.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground bg-muted/30">
                无图片
              </div>
            )}
            {count > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-sm backdrop-blur-sm">
                    +{count - 1}
                </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        }
      />
      <div className="pt-2 px-0.5">
        <h3 className="truncate text-xs font-medium leading-none mb-1">{asset.name}</h3>
        <p className="truncate text-[10px] text-muted-foreground">{asset.type === 'character' ? '角色' : '场景'}</p>
      </div>
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <EditAssetDialog asset={asset} />
        <Button 
          variant="destructive" 
          size="icon" 
          className="h-6 w-6" 
          onClick={async () => {
            await fetch(`/api/assets?id=${asset.id}`, { method: "DELETE" })
            deleteAsset(asset.id)
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  )
}

import { cn } from "@/lib/utils"

export function AssetLibrary({ className }: { className?: string }) {
  const { assets, setAssets } = useStoryStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/assets", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.assets)) setAssets(data.assets)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [setAssets])
  
  const characters = assets.filter(a => a.type === 'character')
  const scenes = assets.filter(a => a.type === 'scene')

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-muted/10", className)}>
      <div className="p-4 border-b">
        <h2 className="mb-2 font-semibold">素材库</h2>
        <CreateAssetDialog />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">角色 ({characters.length})</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {characters.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
            {loading && (
              <div className="text-xs text-muted-foreground col-span-full text-center py-4">加载中...</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">场景 ({scenes.length})</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {scenes.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
            {loading && (
              <div className="text-xs text-muted-foreground col-span-full text-center py-4">加载中...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
