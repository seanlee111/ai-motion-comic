import { AssetLibrary } from "@/components/assets/AssetLibrary"

export default function AssetsPage() {
  return (
    <div className="h-full w-full p-6">
      <h1 className="text-2xl font-bold mb-6">素材管理</h1>
      <div className="h-[calc(100vh-10rem)] border rounded-lg overflow-hidden">
        <AssetLibrary className="w-full h-full border-none" />
      </div>
    </div>
  )
}
