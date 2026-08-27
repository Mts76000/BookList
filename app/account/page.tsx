import { redirect } from "next/navigation";
import { requireAuth, UnauthorizedError } from "@/lib/permissions";
import { AccountView } from "@/app/account/account-view";

// Server Component: the authoritative auth check for this page (proxy.ts only does a cheap
// cookie-presence check — this is the real one, per the requireAuth()/requireRole() rule).
// A session revoked server-side (see "Sessions actives") is rejected here on next navigation,
// even if a client component's cached session state hasn't caught up yet.
export default async function AccountPage() {
  try {
    await requireAuth();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/login");
    throw err;
  }

  return <AccountView />;
}
