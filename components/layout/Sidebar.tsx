"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Box, 
  PenTool, 
  Image as ImageIcon, 
  Video, 
  Settings,
  MessageSquare,
  LayoutGrid
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const sidebarItems = [
  {
    name: "资产",
    href: "/assets",
    icon: Box,
  },
  {
    name: "剧本创作",
    href: "/script-creation",
    icon: PenTool,
  },
  {
    name: "关键帧生成",
    href: "/",
    icon: ImageIcon,
  },
  {
    name: "视频生成",
    href: "/video",
    icon: Video,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex w-[60px] flex-col items-center border-r bg-muted/10 py-4 h-full">
      <div className="flex-1 w-full space-y-2 px-2">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className="block w-full group relative">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-muted mx-auto",
                  isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground"
                )}
                title={item.name}
              >
                <item.icon className="h-5 w-5" />
              </div>
              {/* Tooltip on hover */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md z-50 whitespace-nowrap border">
                {item.name}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-auto w-full space-y-2 px-2">
         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-muted mx-auto" title="项目">
            <LayoutGrid className="h-5 w-5" />
         </Button>
         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-muted mx-auto" title="消息">
            <MessageSquare className="h-5 w-5" />
         </Button>
         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-muted mx-auto" title="设置">
            <Settings className="h-5 w-5" />
         </Button>
      </div>
    </div>
  )
}
