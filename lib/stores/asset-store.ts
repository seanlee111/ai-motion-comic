import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Asset, StoryStore } from '@/types'

interface AssetStore {
  assets: Asset[]
  addAsset: (asset: Omit<Asset, 'id'>) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  setAssets: (assets: Asset[]) => void
}

export const useAssetStore = create<AssetStore>()(
  persist(
    (set) => ({
      assets: [],
      addAsset: (assetData) => set((state) => ({
        assets: [...state.assets, { ...assetData, id: crypto.randomUUID() }]
      })),
      updateAsset: (id, updates) => set((state) => ({
        assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      deleteAsset: (id) => set((state) => ({
        assets: state.assets.filter(a => a.id !== id)
      })),
      setAssets: (assets) => set({ assets }),
    }),
    {
      name: 'ai-motion-comic-assets',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Filter out base64 images from persistence
        assets: state.assets.map(asset => {
           if (asset.imageUrl && asset.imageUrl.startsWith('data:')) {
               return { ...asset, imageUrl: '' };
           }
           return asset;
        })
      })
    }
  )
)
