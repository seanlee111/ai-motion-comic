import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StoryboardFrame, ApiLog } from '@/types'

interface StoryboardStore {
  frames: StoryboardFrame[]
  addFrame: (frame?: Partial<StoryboardFrame>) => void
  updateFrame: (id: string, updates: Partial<StoryboardFrame>) => void
  deleteFrame: (id: string) => void
  setFrames: (frames: StoryboardFrame[]) => void
  reorderFrames: (startIndex: number, endIndex: number) => void
  
  // API Logs
  apiLogs: ApiLog[]
  addApiLog: (log: ApiLog) => void
  deleteApiLog: (id: string) => void
  clearApiLogs: () => void
}

export const useStoryboardStore = create<StoryboardStore>()(
  persist(
    (set) => ({
      frames: [
        { 
            id: 'frame-1', 
            storyScript: '',
            characterIds: [],
            customUploads: [],
            startImages: [],
            endImages: []
        }
      ],
      
      addFrame: (frameData) => set((state) => ({
        frames: [...state.frames, { 
            id: crypto.randomUUID(), 
            storyScript: '', 
            characterIds: [],
            customUploads: [],
            startImages: [],
            endImages: [],
            ...frameData 
        }]
      })),

      updateFrame: (id, updates) => set((state) => ({
        frames: state.frames.map(f => f.id === id ? { ...f, ...updates } : f)
      })),

      deleteFrame: (id) => set((state) => ({
        frames: state.frames.filter(f => f.id !== id)
      })),

      setFrames: (frames) => set({ frames }),

      reorderFrames: (fromIndex, toIndex) => set((state) => {
        const newFrames = [...state.frames];
        const [moved] = newFrames.splice(fromIndex, 1);
        newFrames.splice(toIndex, 0, moved);
        return { frames: newFrames };
      }),
      
      apiLogs: [],
      addApiLog: (log) => set((state) => ({ apiLogs: [log, ...state.apiLogs].slice(0, 100) })),
      deleteApiLog: (id) => set((state) => ({ apiLogs: state.apiLogs.filter(l => l.id !== id) })),
      clearApiLogs: () => set({ apiLogs: [] }),
    }),
    {
      name: 'ai-motion-comic-storyboard',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
          frames: state.frames.map(frame => {
              // Deep clone and clean
              const cleanFrame = { ...frame };
              if (cleanFrame.startImages) {
                  cleanFrame.startImages = cleanFrame.startImages.filter(img => !img.url.startsWith('data:'));
              }
              // ... add other cleanups
              return cleanFrame;
          })
      })
    }
  )
)
