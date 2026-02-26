"use client"

import { Download, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
}

interface ResultGalleryProps {
  images: GeneratedImage[]
}

export function ResultGallery({ images }: ResultGalleryProps) {
  const handleDownload = (url: string, id: string) => {
    // Simple download logic
    const a = document.createElement("a")
    a.href = url
    a.download = `keyframe-${id}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (images.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
        <Film className="mb-4 h-12 w-12 opacity-20" />
        <p>暂无生成的关键帧。</p>
        <p className="text-sm">请在左侧描述场景开始生成。</p>
      </div>
    )
  }

  return (
    <div className="grid h-full w-full grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {images.map((image) => (
        <Card key={image.id} className="group relative overflow-hidden border-0 bg-transparent">
          <CardContent className="p-0">
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
              <img
                src={image.url}
                alt={image.prompt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleDownload(image.url, image.id)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    下载
                  </Button>
                  <Button size="sm" variant="secondary" disabled>
                    <Film className="mr-2 h-4 w-4" />
                    转视频
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground" title={image.prompt}>
              {image.prompt}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
