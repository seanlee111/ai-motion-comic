"use client"

import { AssetLibrary } from "@/components/assets/AssetLibrary"
import { StoryboardWorkbench } from "@/components/storyboard/StoryboardWorkbench"

export default function Home() {
  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Main Content: Storyboard */}
      <div className="flex-1 h-full overflow-hidden">
        <StoryboardWorkbench />
      </div>
    </div>
  )
}
