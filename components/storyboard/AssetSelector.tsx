"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useStoryStore } from "@/lib/story-store"
import { Badge } from "@/components/ui/badge"

interface AssetSelectorProps {
  type: 'character' | 'scene'
  value?: string | string[]
  onChange: (value: string | string[]) => void
  multi?: boolean
}

export function AssetSelector({ type, value, onChange, multi = false }: AssetSelectorProps) {
  const { assets } = useStoryStore()
  const [open, setOpen] = React.useState(false)
  
  const filteredAssets = assets.filter(a => a.type === type)
  
  // Handle single select logic wrapper
  const handleSingleSelect = (currentValue: string) => {
    // If the same value is selected, clear it (toggle off), otherwise set new value
    onChange(currentValue === value ? "" : currentValue)
    setOpen(false)
  }

  // Handle multi select logic
  const handleMultiSelect = (currentValue: string) => {
    const currentValues = Array.isArray(value) ? value : []
    if (currentValues.includes(currentValue)) {
      onChange(currentValues.filter((id) => id !== currentValue))
    } else {
      onChange([...currentValues, currentValue])
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
                    <span className="text-muted-foreground font-normal">Select {type}s...</span>
                )
            ) : (
                selectedLabels ? (
                    <span>{selectedLabels}</span>
                ) : (
                    <span className="text-muted-foreground font-normal">Select {type}...</span>
                )
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Search ${type}...`} />
          <CommandList>
            <CommandEmpty>No {type} found.</CommandEmpty>
            <CommandGroup>
              {filteredAssets.map((asset) => (
                <CommandItem
                  key={asset.id}
                  value={`${asset.name}-${asset.id}`} // Use name-id combination for uniqueness and search
                  onSelect={() => multi ? handleMultiSelect(asset.id) : handleSingleSelect(asset.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      multi 
                        ? (Array.isArray(value) && value.includes(asset.id) ? "opacity-100" : "opacity-0")
                        : (value === asset.id ? "opacity-100" : "opacity-0")
                    )}
                  />
                  {asset.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
