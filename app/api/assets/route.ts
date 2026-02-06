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
    const file = formData.get("file") as File | null;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Missing type or name" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    let imageUrl: string | undefined;

    if (file) {
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/jpeg"
            ? "jpg"
            : "bin";

      const blob = await put(`${IMAGE_PREFIX}${id}.${ext}`, file, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });
      imageUrl = blob.url;
    }

    const asset: RemoteAsset = {
      id,
      type,
      name,
      description,
      imageKeys: [],
      imageUrl,
    };

    const metaBlob = await put(`${META_PREFIX}${id}.json`, JSON.stringify(asset), {
      access: "public",
      contentType: "application/json",
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
    if (meta?.imageUrl) {
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
    const file = formData.get("file") as File | null;

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

    let imageUrl = existing.imageUrl;

    if (file) {
      if (imageUrl) {
        await del(imageUrl);
      }
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/jpeg"
            ? "jpg"
            : "bin";

      const blob = await put(`${IMAGE_PREFIX}${id}.${ext}`, file, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });
      imageUrl = blob.url;
    }

    const updated: RemoteAsset = {
      ...existing,
      id,
      type: type || existing.type,
      name: name || existing.name,
      description,
      imageUrl,
    };

    await put(`${META_PREFIX}${id}.json`, JSON.stringify(updated), {
      access: "public",
      contentType: "application/json",
    });

    return NextResponse.json({ asset: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update asset" },
      { status: 500 }
    );
  }
}
