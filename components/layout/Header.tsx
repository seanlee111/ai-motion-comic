import Link from "next/link"
import { Clapperboard, PenTool } from "lucide-react"
import { SettingsModal } from "./SettingsModal"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center gap-2">
          <Clapperboard className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            AI Motion Comic Studio
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center gap-4">
            <Link href="/script">
                <Button variant="ghost" size="sm">
                    <PenTool className="mr-2 h-4 w-4" />
                    Script Writer
                </Button>
            </Link>
            <SettingsModal />
          </nav>
        </div>
      </div>
    </header>
  )
}
