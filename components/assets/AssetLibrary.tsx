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

  return (
    <Card className="relative overflow-hidden group">
      <EditAssetDialog
        asset={asset}
        trigger={
          <div className="aspect-square w-full bg-muted cursor-pointer">
            {asset.imageUrl ? (
              <img src={asset.imageUrl} alt={asset.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                无图片
              </div>
            )}
          </div>
        }
      />
      <CardContent className="p-2">
        <h3 className="truncate text-sm font-semibold">{asset.name}</h3>
        <p className="truncate text-xs text-muted-foreground">{asset.type}</p>
      </CardContent>
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
          <div className="grid grid-cols-2 gap-2">
            {characters.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
            {loading && (
              <div className="text-xs text-muted-foreground">加载中...</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">场景 ({scenes.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {scenes.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
            {loading && (
              <div className="text-xs text-muted-foreground">加载中...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
