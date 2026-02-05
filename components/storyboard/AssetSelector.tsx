"use client"

import { useStoryStore } from "@/lib/story-store"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

interface AssetSelectorProps {
  type: 'character' | 'scene'
  value?: string
  onChange: (value: string) => void
}

export function AssetSelector({ type, value, onChange }: AssetSelectorProps) {
  const { assets } = useStoryStore()
  const filtered = assets.filter(a => a.type === type)

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={`Select ${type}...`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {filtered.map(asset => (
          <SelectItem key={asset.id} value={asset.id}>
            {asset.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
