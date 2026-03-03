import { create } from 'zustand'
import { useAssetStore } from './stores/asset-store'
import { useScriptStore } from './stores/script-store'
import { useStoryboardStore } from './stores/storyboard-store'
import { StoryStore, Asset, StoryboardFrame, ApiLog, KnowledgeItem, ParsedScript } from '@/types'

// Re-export the new stores for direct usage
export { useAssetStore, useScriptStore, useStoryboardStore }

// Create a compatibility layer that aggregates all stores
// This ensures existing components continue to work without changes
export const useStoryStore = create<StoryStore>()((set, get) => ({
    // Assets Delegate
    get assets() { return useAssetStore.getState().assets },
    addAsset: (a) => useAssetStore.getState().addAsset(a),
    updateAsset: (id, u) => useAssetStore.getState().updateAsset(id, u),
    deleteAsset: (id) => useAssetStore.getState().deleteAsset(id),
    setAssets: (a) => useAssetStore.getState().setAssets(a),

    // Scripts Delegate
    get script() { return useScriptStore.getState().script },
    setScript: (s) => useScriptStore.getState().setScript(s),
    
    get knowledgeBase() { return useScriptStore.getState().knowledgeBase },
    addKnowledgeItem: (i) => useScriptStore.getState().addKnowledgeItem(i),
    updateKnowledgeItem: (id, u) => useScriptStore.getState().updateKnowledgeItem(id, u),
    deleteKnowledgeItem: (id) => useScriptStore.getState().deleteKnowledgeItem(id),
    
    get scripts() { return useScriptStore.getState().scripts },
    addScript: (s) => useScriptStore.getState().addScript(s),
    updateScript: (id, u) => useScriptStore.getState().updateScript(id, u),
    deleteScript: (id) => useScriptStore.getState().deleteScript(id),

    // Storyboard Delegate
    get frames() { return useStoryboardStore.getState().frames },
    setFrames: (f) => useStoryboardStore.getState().setFrames(f),
    addFrame: (f) => useStoryboardStore.getState().addFrame(f),
    updateFrame: (id, u) => useStoryboardStore.getState().updateFrame(id, u),
    deleteFrame: (id) => useStoryboardStore.getState().deleteFrame(id),
    reorderFrames: (from, to) => useStoryboardStore.getState().reorderFrames(from, to),
    
    get apiLogs() { return useStoryboardStore.getState().apiLogs },
    addApiLog: (l) => useStoryboardStore.getState().addApiLog(l),
    deleteApiLog: (id) => useStoryboardStore.getState().deleteApiLog(id),
    clearApiLogs: () => useStoryboardStore.getState().clearApiLogs(),
    
    // Script Logs (Currently mapped to apiLogs in new store structure or we can add specific log store if needed)
    // For now, let's map scriptLogs to apiLogs for simplicity as they are similar
    get scriptLogs() { return useStoryboardStore.getState().apiLogs },
    addScriptLog: (l) => useStoryboardStore.getState().addApiLog(l),
    deleteScriptLog: (id) => useStoryboardStore.getState().deleteApiLog(id),
    clearScriptLogs: () => useStoryboardStore.getState().clearApiLogs(),
    
    // Legacy Generator (Moved logic here or into a service)
    generateStoryboardsFromScript: (script: string) => {
        // This logic is better placed in a service, but for compatibility we keep it.
        // It updates the storyboard store directly.
        const sceneRegex = /\[?Scene\s+\d+\]?:?/i;
        let segments: string[] = [];
        
        if (sceneRegex.test(script)) {
            const rawSegments = script.split(/(\[?Scene\s+\d+\]?:?)/i).filter(s => s.trim().length > 0);
            let currentSegment = "";
            for (const seg of rawSegments) {
                if (sceneRegex.test(seg)) {
                    if (currentSegment) segments.push(currentSegment.trim());
                    currentSegment = seg;
                } else {
                    currentSegment += " " + seg;
                }
            }
            if (currentSegment) segments.push(currentSegment.trim());
        } else {
             const blocks = script.split(/(\[Scene\s+\d+\][^\[]*)/g).filter(s => s.trim().length > 0);
             if (blocks.length > 1) {
                 segments = blocks;
             } else {
                 segments = script.split(/\n\s*\n/).filter((line: string) => line.trim().length > 0);
             }
        }
        
        if (segments.length === 0) return;

        const newFrames: StoryboardFrame[] = segments.map((segment: string) => ({
            id: crypto.randomUUID(),
            storyScript: segment,
            characterIds: [],
            customUploads: [],
            startImages: [],
            endImages: []
        }));
        
        useStoryboardStore.getState().setFrames(newFrames);
    }
}))

// Subscribe to sub-stores to trigger updates in the aggregated store
// This is a bit of a hack to make the aggregated store reactive
// In a real refactor, components should migrate to use specific stores.
const sub1 = useAssetStore.subscribe((state) => useStoryStore.setState({ assets: state.assets }));
const sub2 = useScriptStore.subscribe((state) => useStoryStore.setState({ 
    script: state.script, 
    knowledgeBase: state.knowledgeBase,
    scripts: state.scripts 
}));
const sub3 = useStoryboardStore.subscribe((state) => useStoryStore.setState({ 
    frames: state.frames,
    apiLogs: state.apiLogs,
    scriptLogs: state.apiLogs 
}));

