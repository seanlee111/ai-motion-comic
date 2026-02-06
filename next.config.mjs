/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ["@vercel/blob"]
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'fal.media',
            },
             {
                protocol: 'https',
                hostname: '*.fal.ai',
            }
        ]
    }
};

export default nextConfig;
