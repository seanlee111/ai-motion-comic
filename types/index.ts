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
  
  // Video History
  videoPrompt?: string; // Specific prompt for video generation
  taskId?: string; // Current async task ID for video generation
  videoVersions?: {
      id: string;
      url: string;
      prompt: string;
      modelId: string;
      duration: number;
      timestamp: number;
  }[];

  // State
  isGenerating?: boolean;
}

export interface ApiLog {
    id: string;
    timestamp: number;
    endpoint: string;
    modelId?: string;
    status: number;
    duration: number;
    error?: string;
    requestPayload?: any;
    responseBody?: any;
}

export interface StoryStore {
    frames: StoryboardFrame[];
    script: string;
    setScript: (script: string) => void;
    setFrames: (frames: StoryboardFrame[]) => void;
    addFrame: (frame: StoryboardFrame) => void;
    updateFrame: (id: string, updates: Partial<StoryboardFrame>) => void;
    deleteFrame: (id: string) => void;
    reorderFrames: (startIndex: number, endIndex: number) => void;
    
    // API Logs
    apiLogs: ApiLog[];
    addApiLog: (log: ApiLog) => void;
    clearApiLogs: () => void;

    // Assets
    assets?: Asset[];
    addAsset?: (asset: Omit<Asset, 'id'>) => void;
    updateAsset?: (id: string, updates: Partial<Asset>) => void;
    deleteAsset?: (id: string) => void;
    setAssets?: (assets: Asset[]) => void;
}
