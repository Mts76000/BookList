// URL publique canonique du site, utilisée pour le SEO (sitemap, robots.txt,
// Open Graph, URLs canoniques). À définir en prod via NEXT_PUBLIC_SITE_URL.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000"
).replace(/\/$/, "")

export const SITE_NAME = "BookList"
export const SITE_DESCRIPTION =
  "BookList vous aide à suivre vos lectures, noter vos coups de cœur et visualiser votre évolution au fil du temps."
