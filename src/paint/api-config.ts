export const DEFAULT_API_BASE = 'https://api.openai.com/v1';

/** Accept a site root, API base, or the complete edit endpoint. */
export function imageEditEndpoint(value: string): string {
  const url = new URL(value.trim() || DEFAULT_API_BASE);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('接口地址必须是 HTTP 或 HTTPS 地址，且不能包含密码、查询参数或片段。');
  }
  const path = url.pathname.replace(/\/+$/, '');
  url.pathname = path.endsWith('/images/edits') ? path : (path || '/v1') + '/images/edits';
  return url.href;
}
