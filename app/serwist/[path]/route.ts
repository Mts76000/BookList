import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Une révision permet à Serwist de versionner la page pré-cachée pour éviter
// de servir une réponse obsolète après un déploiement.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  },
);
