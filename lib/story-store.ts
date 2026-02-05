import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StoryState, Asset, StoryboardFrame } from '@/types'

export const useStoryStore = create<StoryState>()(
  persist(
    (set) => ({
      assets: [],
      frames: [
        { id: 'frame-1', storyScript: '' }
      ],

      addAsset: (assetData) => set((state) => ({
        assets: [...state.assets, { ...assetData, id: crypto.randomUUID() }]
      })),

      updateAsset: (id, updates) => set((state) => ({
        assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a)
      })),

      deleteAsset: (id) => set((state) => ({
        assets: state.assets.filter(a => a.id !== id)
      })),

      addFrame: (frameData) => set((state) => ({
        frames: [...state.frames, { id: crypto.randomUUID(), storyScript: '', ...frameData }]
      })),

      updateFrame: (id, updates) => set((state) => ({
        frames: state.frames.map(f => f.id === id ? { ...f, ...updates } : f)
      })),

      deleteFrame: (id) => set((state) => ({
        frames: state.frames.filter(f => f.id !== id)
      })),

      reorderFrames: (fromIndex, toIndex) => set((state) => {
        const newFrames = [...state.frames];
        const [moved] = newFrames.splice(fromIndex, 1);
        newFrames.splice(toIndex, 0, moved);
        return { frames: newFrames };
      }),

      setFrames: (frames) => set({ frames }),
    }),
    {
      name: 'ai-motion-comic-data',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
