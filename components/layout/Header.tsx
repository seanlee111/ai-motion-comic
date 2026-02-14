import Link from "next/link"
import { Clapperboard, PenTool } from "lucide-react"
import { SettingsModal } from "./SettingsModal"
import { Button } from "@/components/ui/button"
import { ApiHealthDialog } from "./ApiHealthDialog"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/30 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 shadow-sm">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/50 blur-lg rounded-full animate-pulse-glow" />
            <Clapperboard className="h-8 w-8 text-primary relative z-10 transition-transform group-hover:scale-110 duration-300" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent tracking-tight">
            Dream Studio
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center gap-4">
            {/* <Link href="/script-creation">
                <Button variant="ghost" size="sm">
                    <PenTool className="mr-2 h-4 w-4" />
                    Script Creation
                </Button>
            </Link> */}
            {/* <ApiHealthDialog /> */}
            {/* <SettingsModal /> */}
          </nav>
        </div>
      </div>
    </header>
  )
}
