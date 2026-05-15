// Cron-job auth helper. Vercel cron sends each job with the secret in the
// Authorization header; other platforms typically use a query param. We accept
// either to keep this portable.

export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unconfigured = never run

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}
