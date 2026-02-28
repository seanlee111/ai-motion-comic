"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useStoryStore } from "@/lib/story-store"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AssetSelectorProps {
  type: 'character' | 'scene'
  value?: string | string[]
  onChange: (value: string | string[]) => void
  multi?: boolean
}

export function AssetSelector({ type, value, onChange, multi = false }: AssetSelectorProps) {
  const { assets } = useStoryStore()
  const [open, setOpen] = React.useState(false)
  
  const filteredAssets = (assets || []).filter(a => a.type === type)
  
  const handleSelect = (assetId: string) => {
    if (multi) {
        const currentValues = Array.isArray(value) ? value : []
        if (currentValues.includes(assetId)) {
            onChange(currentValues.filter((id) => id !== assetId))
        } else {
            onChange([...currentValues, assetId])
        }
    } else {
        // Single select: Toggle off if same, otherwise set
        if (value === assetId) {
             onChange("")
        } else {
             onChange(assetId)
        }
        setOpen(false)
    }
  }

  const selectedLabels = React.useMemo(() => {
    if (multi) {
        const ids = Array.isArray(value) ? value : []
        return ids.map(id => filteredAssets.find(a => a.id === id)?.name).filter(Boolean)
    } else {
        return filteredAssets.find((a) => a.id === value)?.name
    }
  }, [value, filteredAssets, multi])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[40px]"
        >
          <div className="flex flex-wrap gap-1 items-center text-left">
            {multi ? (
                (selectedLabels as string[])?.length > 0 ? (
                    (selectedLabels as string[]).map((label, i) => (
                        <Badge key={i} variant="secondary" className="mr-1">
                            {label}
                        </Badge>
                    ))
                ) : (
                    <span className="text-muted-foreground font-normal">选择{type === 'character' ? '角色' : '场景'}...</span>
                )
            ) : (
                selectedLabels ? (
                    <span>{selectedLabels}</span>
                ) : (
                    <span className="text-muted-foreground font-normal">选择{type === 'character' ? '角色' : '场景'}...</span>
                )
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredAssets.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">未找到{type === 'character' ? '角色' : '场景'}。</div>
            ) : (
                <div className="flex flex-col gap-1">
                    {!multi && (
                         <div 
                            className={cn(
                                "flex items-center space-x-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors",
                                !value && "bg-muted/50"
                            )}
                            onClick={() => { onChange(""); setOpen(false); }}
                        >
                            <div className="w-4 h-4 flex items-center justify-center">
                                {!value && <Check className="h-4 w-4" />}
                            </div>
                            <span className="text-sm text-muted-foreground italic">无</span>
                        </div>
                    )}
                    {filteredAssets.map((asset) => {
                        const isSelected = multi 
                            ? (Array.isArray(value) && value.includes(asset.id))
                            : (value === asset.id);
                            
                        return (
                            <div 
                                key={asset.id}
                                className={cn(
                                    "flex items-center space-x-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors",
                                    isSelected && "bg-muted/50"
                                )}
                                onClick={() => handleSelect(asset.id)}
                            >
                                {multi ? (
                                    <Checkbox 
                                        checked={isSelected} 
                                        onCheckedChange={() => handleSelect(asset.id)}
                                        id={`asset-${asset.id}`}
                                    />
                                ) : (
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        {isSelected && <Check className="h-4 w-4" />}
                                    </div>
                                )}
                                
                                <label 
                                    htmlFor={`asset-${asset.id}`} 
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                    onClick={(e) => e.preventDefault()} // Prevent double toggle if label wraps checkbox
                                >
                                    {asset.name}
                                </label>
                            </div>
                        )
                    })}
                </div>
            )}
          </div>
      </PopoverContent>
    </Popover>
  )
}
