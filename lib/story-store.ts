import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StoryStore, Asset, StoryboardFrame, ApiLog } from '@/types'

export const useStoryStore = create<StoryStore>()(
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

    addAsset: (assetData: Omit<Asset, 'id'>) => set((state: StoryStore) => ({
        assets: [...(state.assets || []), { ...assetData, id: crypto.randomUUID() }]
    })),

    updateAsset: (id: string, updates: Partial<Asset>) => set((state: StoryStore) => ({
        assets: (state.assets || []).map(a => a.id === id ? { ...a, ...updates } : a)
    })),

    deleteAsset: (id: string) => set((state: StoryStore) => ({
        assets: (state.assets || []).filter(a => a.id !== id)
    })),
    setAssets: (assets: Asset[]) => set({ assets }),

    addFrame: (frameData?: Partial<StoryboardFrame>) => set((state: StoryStore) => ({
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

    updateFrame: (id: string, updates: Partial<StoryboardFrame>) => set((state: StoryStore) => ({
        frames: state.frames.map(f => f.id === id ? { ...f, ...updates } : f)
    })),

    deleteFrame: (id: string) => set((state: StoryStore) => ({
        frames: state.frames.filter(f => f.id !== id)
    })),

    reorderFrames: (fromIndex: number, toIndex: number) => set((state: StoryStore) => {
        const newFrames = [...state.frames];
        const [moved] = newFrames.splice(fromIndex, 1);
        newFrames.splice(toIndex, 0, moved);
        return { frames: newFrames };
    }),

    setFrames: (frames: StoryboardFrame[]) => set({ frames }),

    script: '',
    setScript: (script: string) => set({ script }),

    generateStoryboardsFromScript: (script: string) => set((state: StoryStore) => {
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
             // Also treat [Scene X] style blocks as segments if found
             const blocks = script.split(/(\[Scene\s+\d+\][^\[]*)/g).filter(s => s.trim().length > 0);
             if (blocks.length > 1) {
                 segments = blocks;
             } else {
                 segments = script.split(/\n\s*\n/).filter((line: string) => line.trim().length > 0);
             }
        }
        
        // Fallback: if segments is empty (e.g. script was just whitespace), return current state
        if (segments.length === 0) return state;

        const newFrames: StoryboardFrame[] = segments.map((segment: string) => ({
            id: crypto.randomUUID(),
            storyScript: segment,
            characterIds: [],
            customUploads: [],
            startImages: [],
            endImages: []
        }));
        
        return { frames: newFrames };
      }),

      apiLogs: [],
      addApiLog: (log) => set((state) => ({ apiLogs: [log, ...(state.apiLogs || [])].slice(0, 100) })), // Keep last 100 logs
      deleteApiLog: (id) => set((state) => ({ apiLogs: (state.apiLogs || []).filter(l => l.id !== id) })),
      clearApiLogs: () => set({ apiLogs: [] }),

      scriptLogs: [],
      addScriptLog: (log) => set((state) => ({ scriptLogs: [log, ...(state.scriptLogs || [])].slice(0, 100) })),
      deleteScriptLog: (id) => set((state) => ({ scriptLogs: (state.scriptLogs || []).filter(l => l.id !== id) })),
      clearScriptLogs: () => set({ scriptLogs: [] }),
    }),
    {
      name: 'ai-motion-comic-data',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
