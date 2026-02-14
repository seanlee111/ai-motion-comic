"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Settings, Trash2, AlertCircle, CheckCircle2, Clock, ChevronRight, ChevronDown, Copy, History } from "lucide-react"
import { useStoryStore } from "@/lib/story-store"
// import { ScrollArea } from "@/components/ui/scroll-area" 
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { APILog } from "@/types"
import { toast } from "sonner"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

function LogItem({ log, onDelete }: { log: APILog; onDelete: (id: string) => void }) {
    const [expanded, setExpanded] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div className="border rounded-lg bg-background text-sm overflow-hidden transition-all group hover:border-primary/50">
                    <div 
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpanded(!expanded)}
                    >
                        <div className="flex items-center gap-3">
                            <button className="text-muted-foreground hover:text-foreground">
                                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            {log.status >= 200 && log.status < 300 ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] h-5">{log.modelId}</Badge>
                                    <span className={cn(
                                        "text-xs font-bold",
                                        log.status >= 200 && log.status < 300 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {log.status}
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.endpoint}</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                             <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="flex items-center text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                {log.duration}ms
                            </span>
                        </div>
                    </div>

                    {expanded && (
                        <div className="border-t bg-muted/10 p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                            {log.error && (
                                <div className="space-y-1">
                                     <div className="text-[10px] font-semibold uppercase text-red-500 tracking-wider">Error</div>
                                     <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-2 rounded text-xs font-mono break-all border border-red-200 dark:border-red-900">
                                        {log.error}
                                    </div>
                                </div>
                            )}
                            
                            {log.requestPayload && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Request Payload</div>
                                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(log.requestPayload, null, 2)); }}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto w-full max-w-[600px] whitespace-pre">
                                        {JSON.stringify(log.requestPayload, null, 2)}
                                    </div>
                                </div>
                            )}

                            {log.responseBody && (
                                <div className="space-y-1">
                                     <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Response Body</div>
                                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(log.responseBody, null, 2)); }}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto w-full max-w-[600px] whitespace-pre">
                                        {JSON.stringify(log.responseBody, null, 2)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => onDelete(log.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Log
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

export function GlobalSettingsDialog() {
  const { apiLogs, clearApiLogs, deleteApiLog } = useStoryStore()
  const [open, setOpen] = useState(false)

  // Group logs by status
  const logs = apiLogs || [];
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Activity Logs">
          <History className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b flex-none">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
                Activity Logs 
                <Badge variant="secondary" className="text-xs font-normal">{logs.length}</Badge>
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4">
                {logs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <History className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p>No API requests logged yet.</p>
                        <p className="text-xs text-muted-foreground/60">Generate some images to see logs here.</p>
                    </div>
                ) : (
                    <div className="space-y-2 pb-4">
                        {logs.map((log) => (
                            <LogItem key={log.id} log={log} onDelete={deleteApiLog} />
                        ))}
                    </div>
                )}
            </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/5 flex-none">
             <Button variant="destructive" size="sm" onClick={clearApiLogs} disabled={logs.length === 0} className="w-full sm:w-auto">
                <Trash2 className="h-4 w-4 mr-2" /> Clear All History
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
