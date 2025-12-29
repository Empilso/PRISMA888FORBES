/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb', // Aumentando para suportar PDFs e CSVs grandes
        },
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
