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
    async rewrites() {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
        return [
            {
                source: '/api/:path*',
                destination: `${backendUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
