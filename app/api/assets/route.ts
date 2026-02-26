import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";

export const runtime = "nodejs";

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

const META_PREFIX = "assets/meta/";
const IMAGE_PREFIX = "assets/images/";

export async function GET() {
  try {
    const blobs = await list({ prefix: META_PREFIX });
    const assets: RemoteAsset[] = [];

    for (const blob of blobs.blobs) {
      const res = await fetch(blob.url, { cache: "no-store" });
      if (!res.ok) continue;
      const asset = (await res.json()) as RemoteAsset;
      if (asset?.id && asset?.type && asset?.name) {
        assets.push(asset);
      }
    }

    return NextResponse.json({ assets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load assets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as AssetType | null;
    const name = formData.get("name") as string | null;
    const description = (formData.get("description") as string | null) || "";
    
    // Support multiple files
    const files = formData.getAll("files") as File[];
    // Backward compatibility for single file
    const singleFile = formData.get("file") as File | null;
    
    const allFiles = [...files];
    if (singleFile && !files.includes(singleFile)) {
        allFiles.push(singleFile);
    }

    if (!type || !name) {
      return NextResponse.json(
        { error: "Missing type or name" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const imageUrls: string[] = [];

    // Upload all files
    for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        if (!file.size) continue;

        const ext = file.type === "image/png" ? "png" : 
                    file.type === "image/jpeg" ? "jpg" : "bin";
        
        // Unique name for each image
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

    const metaBlob = await put(`${META_PREFIX}${id}.json`, JSON.stringify(asset), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return NextResponse.json({ asset, metaUrl: metaBlob.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const blobs = await list({ prefix: META_PREFIX });
    const metaBlob = blobs.blobs.find((b) => b.pathname === `${META_PREFIX}${id}.json`);

    if (!metaBlob) {
      return NextResponse.json({ ok: true });
    }

    const metaRes = await fetch(metaBlob.url, { cache: "no-store" });
    const meta = metaRes.ok ? ((await metaRes.json()) as RemoteAsset) : undefined;

    await del(metaBlob.url);
    
    // Delete all associated images
    if (meta?.imageUrls && meta.imageUrls.length > 0) {
        // Blobs delete accepts array of URLs? No, del accepts string or string[]
        await del(meta.imageUrls);
    } else if (meta?.imageUrl) {
        await del(meta.imageUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete asset" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string | null;
    const type = formData.get("type") as AssetType | null;
    const name = formData.get("name") as string | null;
    const description = (formData.get("description") as string | null) || "";
    
    // New files
    const files = formData.getAll("files") as File[];
    // Single file legacy
    const singleFile = formData.get("file") as File | null;
    if (singleFile && !files.includes(singleFile)) {
        files.push(singleFile);
    }

    // Existing URLs to keep
    const existingImageUrlsRaw = formData.getAll("existingImageUrls") as string[];
    // Sometimes it might come as a JSON string if client stringifies it
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

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const blobs = await list({ prefix: META_PREFIX });
    const metaBlob = blobs.blobs.find((b) => b.pathname === `${META_PREFIX}${id}.json`);
    if (!metaBlob) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const metaRes = await fetch(metaBlob.url, { cache: "no-store" });
    const existing = metaRes.ok ? ((await metaRes.json()) as RemoteAsset) : undefined;
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Determine images to delete (those in existing.imageUrls but not in existingImageUrls)
    // Note: This logic assumes existingImageUrls contains ONLY valid URLs that were already in the asset.
    const oldUrls = existing.imageUrls || (existing.imageUrl ? [existing.imageUrl] : []);
    
    // Filter out invalid or non-blob URLs before passing to del()
    const urlsToDelete = oldUrls.filter(url => 
        url && 
        typeof url === 'string' && 
        url.includes('.public.blob.vercel-storage.com') && // Ensure it's a Vercel Blob URL
        !existingImageUrls.includes(url)
    );

    if (urlsToDelete.length > 0) {
        await del(urlsToDelete);
    }

    // Handle view mapping
    const viewsMetadataRaw = formData.get("viewsMetadata") as string | null;
    let views: Record<string, string> | undefined;
    if (viewsMetadataRaw) {
        try {
            const rawMap = JSON.parse(viewsMetadataRaw) as Record<string, string>;
            // Map file placeholders to new URLs
            views = {};
            let fileIndex = 0;
            // Need to process new files first to get their URLs
            // We can only map after we have finalImageUrls.
            // Wait, we need to know WHICH file corresponds to WHICH view.
            // The frontend sends `file:0` for the first file in `files` array.
            
            // Let's defer this mapping until after file upload.
        } catch {}
    }

    const finalImageUrls = [...existingImageUrls];
    const newFileUrls: string[] = [];

    // Upload new files
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.size) continue;
        
        // Fix for "Some urls are malformed" - Ensure content type and clean path
        const ext = file.type === "image/png" ? "png" : 
                    file.type === "image/jpeg" ? "jpg" : "bin";
        
        const blob = await put(`${IMAGE_PREFIX}${id}_new_${i}_${Date.now()}.${ext}`, file, {
            access: "public",
            contentType: file.type || "application/octet-stream",
            addRandomSuffix: false // We already have timestamp
        });
        finalImageUrls.push(blob.url);
        newFileUrls.push(blob.url);
    }

    // Now reconstruct the views map
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

    return NextResponse.json({ asset: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update asset" },
      { status: 500 }
    );
  }
}
