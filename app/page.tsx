"use client"

import { AssetLibrary } from "@/components/assets/AssetLibrary"
import { StoryboardWorkbench } from "@/components/storyboard/StoryboardWorkbench"

export default function Home() {
  return (
    <div className="flex h-full gap-4 p-4">
        <div className="flex-1 h-full overflow-hidden rounded-lg border border-[#333]">
            <StoryboardWorkbench />
        </div>
        <div className="w-[300px] h-full flex-none rounded-lg border border-[#333] overflow-hidden bg-[#1a1a1a]">
            <AssetLibrary className="h-full" />
        </div>
    </div>
  )
}
