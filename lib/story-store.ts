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
            customUploads: [],
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
        // Parse the script to extract scenes based on [Scene X] or similar headers
        // If no headers found, fallback to paragraph splitting
        let segments: string[] = [];
        
        // Regex to match [Scene X] or Scene X: or similar headers
        const sceneRegex = /\[?Scene\s+\d+\]?:?/i;
        
        if (sceneRegex.test(script)) {
            // Split by the regex but keep the delimiters or reconstruct them
            // Since JS split doesn't easily keep delimiters in a way that groups them with following text without complex lookahead,
            // we'll split and then regroup.
            const rawSegments = script.split(/(\[?Scene\s+\d+\]?:?)/i).filter(s => s.trim().length > 0);
            
            let currentSegment = "";
            
            for (const seg of rawSegments) {
                if (sceneRegex.test(seg)) {
                    // It's a header
                    if (currentSegment) {
                        segments.push(currentSegment.trim());
                    }
                    currentSegment = seg;
                } else {
                    // It's content
                    currentSegment += " " + seg;
                }
            }
            if (currentSegment) {
                segments.push(currentSegment.trim());
            }
        } else {
             // Fallback to double newline split for paragraphs, merging single newlines
             segments = script.split(/\n\s*\n/).filter((line: string) => line.trim().length > 0);
        }

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
