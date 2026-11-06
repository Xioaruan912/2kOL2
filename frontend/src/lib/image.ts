const PROXY_HOSTS = ["game.gtimg.cn"];

/** 官方图片统一走后端反代与缓存，避免 CDN 直连慢或被拦截 */
export function imageUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (
      PROXY_HOSTS.some(
        (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
      )
    ) {
      return `/api/image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // 非绝对地址按原样返回
  }
  return url;
}
