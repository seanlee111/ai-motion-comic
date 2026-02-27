'use server';

import { put, list, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

const META_PREFIX = "assets/meta/";
const IMAGE_PREFIX = "assets/images/";

type AssetType = "character" | "scene";

type RemoteAsset = {
  id: string;
  type: AssetType;
  name: string;
  description: string;
  imageKeys: string[];
  imageUrl?: string;
  imageUrls?: string[];
  views?: Record<string, string>;
};

export async function getAssetsAction() {
  try {
    const blobs = await list({ prefix: META_PREFIX });
    const assets: RemoteAsset[] = [];

    // Parallel fetch for speed
    const results = await Promise.all(blobs.blobs.map(async (blob) => {
        try {
            const res = await fetch(blob.url, { cache: "no-store" });
            if (!res.ok) return null;
            return await res.json() as RemoteAsset;
        } catch {
            return null;
        }
    }));

    for (const asset of results) {
        if (asset?.id && asset?.type && asset?.name) {
            assets.push(asset);
        }
    }

    return { success: true, assets };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load assets" };
  }
}

export async function createAssetAction(formData: FormData) {
  try {
    const type = formData.get("type") as AssetType | null;
    const name = formData.get("name") as string | null;
    const description = (formData.get("description") as string | null) || "";
    
    const files = formData.getAll("files") as File[];
    // Backward compatibility
    const singleFile = formData.get("file") as File | null;
    const allFiles = [...files];
    if (singleFile && !files.includes(singleFile)) {
        allFiles.push(singleFile);
    }

    if (!type || !name) {
      return { success: false, error: "Missing type or name" };
    }

    const id = crypto.randomUUID();
    const imageUrls: string[] = [];

    for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        if (!file.size) continue;

        const ext = file.type === "image/png" ? "png" : 
                    file.type === "image/jpeg" ? "jpg" : "bin";
        
        const blob = await put(`${IMAGE_PREFIX}${id}_${i}_${Date.now()}.${ext}`, file, {
            access: "public",
            contentType: file.type || "application/octet-stream",
        });
        imageUrls.push(blob.url);
    }

    const asset: RemoteAsset = {
      id,
      type,
      name,
      description,
      imageKeys: [],
      imageUrl: imageUrls.length > 0 ? imageUrls[0] : undefined,
      imageUrls,
    };

    await put(`${META_PREFIX}${id}.json`, JSON.stringify(asset), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    revalidatePath('/'); // Optional: Revalidate relevant paths
    return { success: true, asset };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create asset" };
  }
}

export async function deleteAssetAction(id: string) {
  try {
    if (!id) return { success: false, error: "Missing id" };

    const blobs = await list({ prefix: META_PREFIX });
    const metaBlob = blobs.blobs.find((b) => b.pathname === `${META_PREFIX}${id}.json`);

    if (!metaBlob) {
      return { success: true }; // Already gone
    }

    const metaRes = await fetch(metaBlob.url, { cache: "no-store" });
    const meta = metaRes.ok ? ((await metaRes.json()) as RemoteAsset) : undefined;

    await del(metaBlob.url);
    
    if (meta?.imageUrls && meta.imageUrls.length > 0) {
        // Safe delete
        const validUrls = meta.imageUrls.filter(u => u && u.includes('.public.blob.vercel-storage.com'));
        if (validUrls.length > 0) await del(validUrls);
    } else if (meta?.imageUrl && meta.imageUrl.includes('.public.blob.vercel-storage.com')) {
        await del(meta.imageUrl);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete asset" };
  }
}

export async function updateAssetAction(formData: FormData) {
  try {
    const id = formData.get("id") as string | null;
    const type = formData.get("type") as AssetType | null;
    const name = formData.get("name") as string | null;
    const description = (formData.get("description") as string | null) || "";
    
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    if (singleFile && !files.includes(singleFile)) {
        files.push(singleFile);
    }

    const existingImageUrlsRaw = formData.getAll("existingImageUrls") as string[];
    let existingImageUrls: string[] = [];
    existingImageUrlsRaw.forEach(val => {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) existingImageUrls.push(...parsed);
            else existingImageUrls.push(val);
        } catch {
            existingImageUrls.push(val);
        }
    });

    if (!id) return { success: false, error: "Missing id" };

    const blobs = await list({ prefix: META_PREFIX });
    const metaBlob = blobs.blobs.find((b) => b.pathname === `${META_PREFIX}${id}.json`);
    if (!metaBlob) return { success: false, error: "Asset not found" };

    const metaRes = await fetch(metaBlob.url, { cache: "no-store" });
    const existing = metaRes.ok ? ((await metaRes.json()) as RemoteAsset) : undefined;
    if (!existing) return { success: false, error: "Asset not found" };

    const oldUrls = existing.imageUrls || (existing.imageUrl ? [existing.imageUrl] : []);
    const urlsToDelete = oldUrls.filter(url => 
        url && 
        typeof url === 'string' && 
        url.includes('.public.blob.vercel-storage.com') && 
        !existingImageUrls.includes(url)
    );

    if (urlsToDelete.length > 0) {
        await del(urlsToDelete);
    }

    // Handle View Metadata & New Files
    const viewsMetadataRaw = formData.get("viewsMetadata") as string | null;
    let views: Record<string, string> | undefined;
    
    const finalImageUrls = [...existingImageUrls];
    const newFileUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.size) continue;
        
        const ext = file.type === "image/png" ? "png" : 
                    file.type === "image/jpeg" ? "jpg" : "bin";
        
        const blob = await put(`${IMAGE_PREFIX}${id}_new_${i}_${Date.now()}.${ext}`, file, {
            access: "public",
            contentType: file.type || "application/octet-stream",
            addRandomSuffix: false
        });
        finalImageUrls.push(blob.url);
        newFileUrls.push(blob.url);
    }

    if (viewsMetadataRaw) {
        try {
            const rawMap = JSON.parse(viewsMetadataRaw) as Record<string, string>;
            views = {};
            Object.entries(rawMap).forEach(([viewName, val]) => {
                if (val.startsWith("file:")) {
                    const index = parseInt(val.split(":")[1]);
                    if (newFileUrls[index]) {
                        views![viewName] = newFileUrls[index];
                    }
                } else {
                    views![viewName] = val;
                }
            });
        } catch {}
    }

    const updated: RemoteAsset = {
      ...existing,
      id,
      type: type || existing.type,
      name: name || existing.name,
      description,
      imageKeys: [],
      imageUrl: finalImageUrls.length > 0 ? finalImageUrls[0] : undefined,
      imageUrls: finalImageUrls,
      views,
    };

    await put(`${META_PREFIX}${id}.json`, JSON.stringify(updated), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    revalidatePath('/');
    return { success: true, asset: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update asset" };
  }
}
