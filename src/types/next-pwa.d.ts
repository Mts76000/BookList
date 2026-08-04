declare module "next-pwa" {
  import type { NextConfig } from "next"

  function withPWA(config: {
    dest?: string
    register?: boolean
    skipWaiting?: boolean
    disable?: boolean
  }): (nextConfig: NextConfig) => NextConfig

  export default withPWA
}
