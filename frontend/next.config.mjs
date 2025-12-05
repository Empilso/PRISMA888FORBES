/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb', // Aumentando para suportar PDFs e CSVs grandes
        },
    },
};

export default nextConfig;
