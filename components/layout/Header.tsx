import Link from "next/link"
import { Clapperboard, PenTool } from "lucide-react"
import { SettingsModal } from "./SettingsModal"
import { Button } from "@/components/ui/button"
import { ApiHealthDialog } from "./ApiHealthDialog"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b-4 border-black bg-background shadow-[0_4px_0_0_rgba(0,0,0,0.1)]">
      <div className="container flex h-16 max-w-screen-2xl items-center relative overflow-hidden">
        {/* Decorative Splatter */}
        <div className="absolute top-[-10px] left-[200px] w-12 h-12 bg-accent rounded-full opacity-50 blur-sm animate-blob" />
        
        <Link href="/" className="mr-6 flex items-center gap-2 group relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-secondary rounded-full scale-110 -rotate-6 group-hover:rotate-12 transition-transform" />
            <Clapperboard className="h-8 w-8 text-white relative z-10" />
          </div>
          <span className="text-2xl font-black text-foreground tracking-tighter group-hover:text-primary transition-colors" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>
            HOCKNEY<span className="text-primary">STUDIO</span>
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
