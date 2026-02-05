import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppState {
  falKey: string
  klingKey: string
  minimaxKey: string
  jimengKey: string
  nanobananaKey: string
  llmKey: string
  
  setFalKey: (key: string) => void
  setKlingKey: (key: string) => void
  setMinimaxKey: (key: string) => void
  setJimengKey: (key: string) => void
  setNanobananaKey: (key: string) => void
  setLlmKey: (key: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      falKey: '',
      klingKey: '',
      minimaxKey: '',
      jimengKey: '',
      nanobananaKey: '',
      llmKey: '',
      
      setFalKey: (key) => set({ falKey: key }),
      setKlingKey: (key) => set({ klingKey: key }),
      setMinimaxKey: (key) => set({ minimaxKey: key }),
      setJimengKey: (key) => set({ jimengKey: key }),
      setNanobananaKey: (key) => set({ nanobananaKey: key }),
      setLlmKey: (key) => set({ llmKey: key }),
    }),
    {
      name: 'ai-motion-comic-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
