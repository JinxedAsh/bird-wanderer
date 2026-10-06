export function tunnelOrigin(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password) {
    throw new Error('TUNNEL_ORIGIN must be an exact HTTPS origin without a path or trailing slash.');
  }
  return url.origin;
}

export function quickTunnelOrigin(output) {
  return output.match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b/i)?.[0] || null;
}
