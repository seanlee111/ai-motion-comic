"use client"

import { AssetLibrary } from "@/components/assets/AssetLibrary"
import { StoryboardWorkbench } from "@/components/storyboard/StoryboardWorkbench"

export default function Home() {
  return (
    <main className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Left Sidebar: Assets */}
      <AssetLibrary />
      
      {/* Main Content: Storyboard */}
      <div className="flex-1 h-full overflow-hidden border-l">
        <StoryboardWorkbench />
      </div>
    </main>
  )
}
