export interface Asset {
  id: string;
  type: 'character' | 'scene';
  name: string;
  description: string;
  imageKeys: string[]; // Keys in IndexedDB
  imageUrl?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  modelId: string; // e.g. "fal-flux-pro-v1.1"
  timestamp: number;
}

export interface StoryboardFrame {
  id: string;
  
  // Script Data
  storyScript: string; // The core action description
  duration?: number; // Estimated duration in seconds
  actionNotes?: string; // Camera movement, specific character acting details
  
  // Asset Links
  characterIds: string[]; // Changed from single ID to array
  sceneId?: string;
  
  // Visuals
  // Deprecated single string URLs in favor of array of GeneratedImage
  // We keep the "selected" URL for display, but store all candidates
  
  startImages: GeneratedImage[];
  endImages: GeneratedImage[];
  
  selectedStartImageId?: string;
  selectedEndImageId?: string;

  // Backward compatibility
  imageUrl?: string;
  startImageUrl?: string;
  endImageUrl?: string;
  characterId?: string;
  
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
  setAssets: (assets: Asset[]) => void;

  // Frame Actions
  addFrame: (frameData?: Partial<StoryboardFrame>) => void;
  updateFrame: (id: string, updates: Partial<StoryboardFrame>) => void;
  deleteFrame: (id: string) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  setFrames: (frames: StoryboardFrame[]) => void; // For bulk import from script
}
