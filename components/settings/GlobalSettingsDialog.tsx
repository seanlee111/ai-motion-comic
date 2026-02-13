"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Settings, Trash2, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function GlobalSettingsDialog() {
  const { apiLogs, clearApiLogs } = useStoryStore()
  const [open, setOpen] = useState(false)

  // Group logs by status
  const logs = apiLogs || [];
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Settings & History</span>
            <Button variant="outline" size="sm" onClick={clearApiLogs} disabled={logs.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" /> Clear History
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                API Request History ({logs.length})
            </div>
            
            <ScrollArea className="flex-1 border rounded-md bg-muted/10 p-4">
                {logs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        No API requests logged yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <div key={log.id} className="border rounded-lg p-3 bg-background text-sm space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {log.status >= 200 && log.status < 300 ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <Badge variant="outline">{log.modelId}</Badge>
                                        <span className="font-mono text-xs text-muted-foreground">{log.endpoint}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs">
                                    <span className={cn(
                                        "font-bold",
                                        log.status >= 200 && log.status < 300 ? "text-green-600" : "text-red-600"
                                    )}>
                                        Status: {log.status}
                                    </span>
                                    <span className="flex items-center text-muted-foreground">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {log.duration}ms
                                    </span>
                                </div>

                                {log.error && (
                                    <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-2 rounded text-xs font-mono break-all">
                                        {log.error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
