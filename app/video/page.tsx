import { Film } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VideoPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
        <Film className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">视频生成</h1>
      <p className="text-muted-foreground max-w-md">
        在此处将您的关键帧转换为连贯的动态漫画视频。
        目前功能正在开发中，敬请期待！
      </p>
      <Button disabled>开始生成视频</Button>
    </div>
  )
}
