"use client"

import { useState } from "react"
import { Loader2, Play, Layout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { parseScriptAction } from "@/app/actions/script"

type ParsedShot = {
    id: string;
    description: string;
    dialogue: string;
    camera: string;
    character: string;
}

type ParsedScene = {
    id: string;
    location: string;
    description: string;
    characters: string[];
    shots: ParsedShot[];
}

type ParsedScript = {
    title: string;
    scenes: ParsedScene[];
}

export function ScriptParser() {
  const [script, setScript] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParsedScript | null>(null)

  const handleParse = async () => {
    if (!script.trim()) return;
    
    setLoading(true);
    try {
        const res = await parseScriptAction(script);
        if (!res.success) {
            throw new Error(res.error);
        }
        setResult(res.data);
        toast.success("剧本解析成功");
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
      {/* Input Area */}
      <Card className="flex flex-col h-full bg-[#1a1a1a] border-[#333] text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">剧本输入</CardTitle>
            <Button 
                onClick={handleParse} 
                disabled={loading || !script.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
            >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                智能解析
            </Button>
        </CardHeader>
        <CardContent className="flex-1 p-4 pt-0">
            <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="在此输入剧本内容..."
                className="h-full bg-[#111] border-0 resize-none text-base leading-relaxed p-4 font-mono text-gray-300 focus-visible:ring-1 focus-visible:ring-gray-700"
            />
        </CardContent>
      </Card>

      {/* Output Area */}
      <Card className="flex flex-col h-full bg-[#1a1a1a] border-[#333] text-white overflow-hidden">
        <CardHeader className="pb-2 border-b border-[#333]">
            <CardTitle className="text-lg font-medium">分镜列表</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            {!result ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                    <Layout className="h-12 w-12 opacity-20" />
                    <p>暂无解析结果</p>
                </div>
            ) : (
                <div className="p-4 space-y-6">
                    <h2 className="text-xl font-bold text-center">{result.title}</h2>
                    {result.scenes.map((scene, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                            <div className="bg-[#252525] p-3 rounded-lg border border-[#444]">
                                <div className="font-bold text-blue-400 text-sm mb-1">{scene.location}</div>
                                <div className="text-xs text-gray-400">{scene.description}</div>
                                <div className="flex gap-2 mt-2">
                                    {scene.characters.map((char, cIdx) => (
                                        <span key={cIdx} className="text-[10px] bg-[#333] px-2 py-0.5 rounded-full text-gray-300">
                                            {char}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2 pl-4 border-l-2 border-[#333]">
                                {scene.shots.map((shot, shotIdx) => (
                                    <div key={shotIdx} className="bg-[#222] p-3 rounded border border-[#333] hover:border-[#555] transition-colors flex gap-3">
                                        <div className="flex-none w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-xs font-mono text-gray-500">
                                            {shotIdx + 1}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium text-gray-200">{shot.description}</span>
                                                <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">{shot.camera}</span>
                                            </div>
                                            {shot.dialogue && (
                                                <div className="text-xs text-gray-400 italic">“{shot.dialogue}”</div>
                                            )}
                                            {shot.character && (
                                                <div className="text-[10px] text-purple-400">@{shot.character}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
