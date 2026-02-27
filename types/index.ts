export interface Asset {
  id: string;
  type: 'character' | 'scene';
  name: string;
  description: string;
  imageKeys: string[]; // Keys in IndexedDB
  imageUrl?: string;
  imageUrls?: string[]; // Multiple reference images
  
  // Character specific view mapping
  views?: {
      [key: string]: string; // "Front" | "Side" | "Back" | "Three-Quarter" | "Close-up" -> URL
  };
}

export interface GeneratedImage {
  id: string;
  url: string;
  modelId: string; // e.g. "fal-flux-pro-v1.1"
  timestamp: number;
  batchId?: string;
  shot?: 'start' | 'end';
}

export interface StoryboardFrame {
  id: string;
  
  // Script Data
  storyScript: string; // The core action description
  actionNotes?: string; // Camera movement, specific character acting details
  
  // Asset Links
  characterIds: string[]; // Changed from single ID to array
  sceneId?: string;
  customUploads?: string[]; // Custom uploaded reference images (base64 or url)

  // Start Shot Specifics (Overrides)
  startScript?: string;
  startActionNotes?: string;
  startCharacterIds?: string[];
  startSceneId?: string;
  startCustomUploads?: string[];

  // End Shot Specifics (Overrides)
  endScript?: string;
  endActionNotes?: string;
  endCharacterIds?: string[];
  endSceneId?: string;
  endCustomUploads?: string[];
  
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
  videoUrl?: string; // New: Generated video URL
  
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

  // Script Actions
  script?: string;
  setScript: (script: string) => void;
  generateStoryboardsFromScript: (script: string) => void;

  // Logs
  apiLogs?: APILog[];
  addApiLog: (log: APILog) => void;
  deleteApiLog: (id: string) => void;
  clearApiLogs: () => void;
}

export interface APILog {
  id: string;
  timestamp: number;
  endpoint: string;
  modelId: string;
  status: number;
  duration: number;
  error?: string;
  requestPayload?: any; // Added for detailed view
  responseBody?: any; // Added for detailed view
}
