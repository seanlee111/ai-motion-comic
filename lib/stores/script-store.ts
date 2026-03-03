import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ParsedScript, KnowledgeItem } from '@/types'

interface ScriptStore {
  // Current active script (text)
  script: string
  setScript: (script: string) => void
  
  // Knowledge Base
  knowledgeBase: KnowledgeItem[]
  addKnowledgeItem: (item: Omit<KnowledgeItem, 'id' | 'createdAt'>) => void
  updateKnowledgeItem: (id: string, updates: Partial<KnowledgeItem>) => void
  deleteKnowledgeItem: (id: string) => void
  
  // Saved Scripts (Parsed)
  scripts: ParsedScript[]
  addScript: (script: ParsedScript) => void
  updateScript: (id: string, updates: Partial<ParsedScript>) => void
  deleteScript: (id: string) => void
}

export const useScriptStore = create<ScriptStore>()(
  persist(
    (set) => ({
      script: '',
      setScript: (script) => set({ script }),
      
      knowledgeBase: [],
      addKnowledgeItem: (item) => set((state) => ({
        knowledgeBase: [...state.knowledgeBase, { ...item, id: crypto.randomUUID(), createdAt: Date.now() }]
      })),
      updateKnowledgeItem: (id, updates) => set((state) => ({
        knowledgeBase: state.knowledgeBase.map(k => k.id === id ? { ...k, ...updates } : k)
      })),
      deleteKnowledgeItem: (id) => set((state) => ({
        knowledgeBase: state.knowledgeBase.filter(k => k.id !== id)
      })),
      
      scripts: [],
      addScript: (script) => set((state) => ({ scripts: [script, ...state.scripts] })),
      updateScript: (id, updates) => set((state) => ({
        scripts: state.scripts.map(s => s.id === id ? { ...s, ...updates } : s)
      })),
      deleteScript: (id) => set((state) => ({
        scripts: state.scripts.filter(s => s.id !== id)
      })),
    }),
    {
      name: 'ai-motion-comic-scripts',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
