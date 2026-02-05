import { set, get, del } from 'idb-keyval';

export const ImageStorage = {
  save: async (file: File): Promise<string> => {
    const id = crypto.randomUUID();
    const buffer = await file.arrayBuffer();
    // Save blob to IndexedDB
    await set(id, new Blob([buffer], { type: file.type }));
    return id;
  },

  get: async (id: string): Promise<string | null> => {
    try {
      const blob = await get(id);
      if (!blob) return null;
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Failed to load image from IDB', e);
      return null;
    }
  },

  delete: async (id: string) => {
    await del(id);
  }
};
