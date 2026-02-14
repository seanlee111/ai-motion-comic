import Link from "next/link"
import { Clapperboard, PenTool } from "lucide-react"
import { SettingsModal } from "./SettingsModal"
import { Button } from "@/components/ui/button"
import { ApiHealthDialog } from "./ApiHealthDialog"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-rough bg-background/90 backdrop-blur-sm">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center gap-2 group">
          <div className="relative p-1 border-rough bg-white rounded-sm transform -rotate-2 group-hover:rotate-3 transition-transform duration-300">
             <Clapperboard className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground/90 font-serif italic">
            Art Motion Studio
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
