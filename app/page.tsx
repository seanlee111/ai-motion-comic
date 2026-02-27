"use client"

import { useState } from "react"
import { AssetLibrary } from "@/components/assets/AssetLibrary"
import { StoryboardWorkbench } from "@/components/storyboard/StoryboardWorkbench"
import { ScriptParser } from "@/components/script/ScriptParser"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  const [activeTab, setActiveTab] = useState("script")

  return (
    <div className="flex h-full flex-col bg-[#121212] text-white overflow-hidden">
      {/* Top Navigation */}
      <div className="flex-none h-12 border-b border-[#333] flex items-center px-4 bg-[#1a1a1a]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent border-0 p-0 h-auto gap-6">
                <TabsTrigger 
                    value="script" 
                    className="data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-500 rounded-none px-0 py-2 transition-all"
                >
                    剧本解析
                </TabsTrigger>
                <TabsTrigger 
                    value="storyboard" 
                    className="data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-500 rounded-none px-0 py-2 transition-all"
                >
                    分镜制作
                </TabsTrigger>
                <TabsTrigger 
                    value="assets" 
                    className="data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-500 rounded-none px-0 py-2 transition-all"
                >
                    资产管理
                </TabsTrigger>
            </TabsList>
        </Tabs>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-4 relative">
          {activeTab === "script" && (
              <ScriptParser />
          )}
          
          {activeTab === "storyboard" && (
              <div className="flex h-full gap-4">
                  <div className="flex-1 h-full overflow-hidden rounded-lg border border-[#333]">
                      <StoryboardWorkbench />
                  </div>
                  <div className="w-[300px] h-full flex-none rounded-lg border border-[#333] overflow-hidden bg-[#1a1a1a]">
                      <AssetLibrary className="h-full" />
                  </div>
              </div>
          )}

          {activeTab === "assets" && (
              <div className="h-full overflow-y-auto">
                  <AssetLibrary className="h-full max-w-7xl mx-auto" />
              </div>
          )}
      </div>
    </div>
  )
}
