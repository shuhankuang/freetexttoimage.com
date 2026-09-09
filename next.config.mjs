/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许通过 NEXT_DIST 覆盖构建目录，便于在多个 dev 进程并存时隔离验证
  distDir: process.env.NEXT_DIST || ".next",
};

export default nextConfig;
