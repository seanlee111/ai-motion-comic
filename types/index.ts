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

export interface ParsedShot {
    id: string;
    description: string;
    dialogue: string;
    camera: string;
    character: string;
}

export interface ParsedScene {
    id: string;
    location: string;
    description: string;
    characters: string[];
    shots: ParsedShot[];
}

export interface ParsedScript {
    id: string; // Add ID for management
    title: string;
    style?: string;
    scenes: ParsedScene[];
    createdAt?: number;
    knowledgeBaseContext?: string;
}

export interface StoryboardFrame {
  id: string;
  
  // Script Context (New)
  scriptId?: string; // Link to parent script
  sceneLocation?: string; // e.g., "内景 空间站 - 夜"
  shotId?: string; // e.g., "shot_1"
  shotHeader?: string; // e.g., "MS", "CU"

  // Script Data
  storyScript: string; // The core action description
  actionNotes?: string; // Camera movement, specific character acting details
  
  // Asset Links
  characterIds: string[]; // Changed from single ID to array
  sceneId?: string; // Link to visual scene asset (background)
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
    
    // Knowledge Base
    knowledgeBase?: string;
    setKnowledgeBase?: (kb: string | ((prev: string) => string)) => void;
    setFrames: (frames: StoryboardFrame[]) => void;
    addFrame: (frame?: Partial<StoryboardFrame>) => void;
    updateFrame: (id: string, updates: Partial<StoryboardFrame>) => void;
    deleteFrame: (id: string) => void;
    reorderFrames: (startIndex: number, endIndex: number) => void;
    
    // API Logs
    apiLogs: ApiLog[];
    addApiLog: (log: ApiLog) => void;
    deleteApiLog: (id: string) => void;
    clearApiLogs: () => void;

    // Script Logs
    scriptLogs?: ApiLog[];
    addScriptLog?: (log: ApiLog) => void;
    deleteScriptLog?: (id: string) => void;
    clearScriptLogs?: () => void;

    // Assets
    assets?: Asset[];
    addAsset?: (asset: Omit<Asset, 'id'>) => void;
    updateAsset?: (id: string, updates: Partial<Asset>) => void;
    deleteAsset?: (id: string) => void;
    setAssets?: (assets: Asset[]) => void;

    // Scripts (New)
    scripts: ParsedScript[];
    addScript: (script: ParsedScript) => void;
    updateScript: (id: string, updates: Partial<ParsedScript>) => void;
    deleteScript: (id: string) => void;
}
