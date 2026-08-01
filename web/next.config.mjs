/**
 * The whole point of this file: /mac and /win are one hop straight to the
 * installer. No page render, no JavaScript, no clicking. Visiting
 * novaesp.vercel.app/mac on a fresh machine starts the download.
 *
 * Set NEXT_PUBLIC_GH_REPO in the Vercel dashboard (Settings > Environment
 * Variables) to "<your-github-username>/forge32" so you never edit code.
 */
const REPO = process.env.NEXT_PUBLIC_GH_REPO || 'YOUR-GITHUB-USERNAME/forge32';

const asset = (file) => `https://github.com/${REPO}/releases/latest/download/${file}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // 307, not 308: the target moves every release and must never be cached.
      { source: '/mac', destination: asset('NovaESP-mac-arm64.dmg'), permanent: false },
      { source: '/mac/intel', destination: asset('NovaESP-mac-x64.dmg'), permanent: false },
      { source: '/win', destination: asset('NovaESP-win-x64.exe'), permanent: false },
      { source: '/windows', destination: '/win', permanent: false },
      { source: '/source', destination: `https://github.com/${REPO}`, permanent: false },
    ];
  },
};

export default nextConfig;
