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
                // Proxy para o backend, EXCETO rotas que sabemos que são locais (como /api/maps)
                source: '/api/:path((?!maps).*)',
                destination: `${backendUrl}/api/:path`,
            },
        ];
    },
};

export default nextConfig;
