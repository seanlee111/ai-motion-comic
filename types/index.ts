export interface Asset {
  id: string;
  type: 'character' | 'scene';
  name: string;
  description: string;
  imageKeys: string[]; // Keys in IndexedDB
}

export interface StoryboardFrame {
  id: string;
  
  // Script Data
  storyScript: string; // The core action description
  duration?: number; // Estimated duration in seconds
  actionNotes?: string; // Camera movement, specific character acting details
  
  // Asset Links
  characterId?: string;
  sceneId?: string;
  
  // Visuals
  imageUrl?: string; // Kept for backward compatibility or single-image mode
  startImageUrl?: string;
  endImageUrl?: string;
  
  // State
  isGenerating?: boolean;
}

export interface StoryState {
  assets: Asset[];
  frames: StoryboardFrame[];
  
  // Asset Actions
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;

  // Frame Actions
  addFrame: (frameData?: Partial<StoryboardFrame>) => void;
  updateFrame: (id: string, updates: Partial<StoryboardFrame>) => void;
  deleteFrame: (id: string) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  setFrames: (frames: StoryboardFrame[]) => void; // For bulk import from script
}
