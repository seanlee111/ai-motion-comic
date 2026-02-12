import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StoryState, Asset, StoryboardFrame } from '@/types'

export const useStoryStore = create<StoryState>()(
  persist(
    (set) => ({
      assets: [],
      frames: [
        { 
            id: 'frame-1', 
            storyScript: '',
            characterIds: [],
            startImages: [],
            endImages: []
        }
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
      setAssets: (assets: Asset[]) => set({ assets }),

      addFrame: (frameData) => set((state) => ({
        frames: [...state.frames, { 
            id: crypto.randomUUID(), 
            storyScript: '', 
            characterIds: [],
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

      reorderFrames: (fromIndex, toIndex) => set((state) => {
        const newFrames = [...state.frames];
        const [moved] = newFrames.splice(fromIndex, 1);
        newFrames.splice(toIndex, 0, moved);
        return { frames: newFrames };
      }),

      setFrames: (frames: StoryboardFrame[]) => set({ frames }),

      script: '',
      setScript: (script: string) => set({ script }),

      generateStoryboardsFromScript: (script: string) => set((state) => {
        // Simple mock logic: split by newlines and create a frame for each paragraph
        // In real app, use LLM to parse scene/action
        const segments = script.split('\n').filter((line: string) => line.trim().length > 0);
        const newFrames: StoryboardFrame[] = segments.map((segment: string) => ({
            id: crypto.randomUUID(),
            storyScript: segment,
            characterIds: [],
            startImages: [],
            endImages: []
        }));
        
        // If script is empty or no segments, keep at least one frame
        if (newFrames.length === 0) return state;

        return { frames: newFrames };
      }),
    }),
    {
      name: 'ai-motion-comic-data',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
