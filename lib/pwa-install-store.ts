export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

// Registered once at module load, not inside a component effect: `beforeinstallprompt`
// fires at most once per page load, so a listener attached only when e.g. the account page
// mounts would miss it whenever the user lands somewhere else first.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
}

export function subscribeToPwaInstallPrompt(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaInstallPrompt() {
  return deferredPrompt;
}

export function getPwaInstallPromptServerSnapshot() {
  return null;
}

export async function triggerPwaInstall() {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  deferredPrompt = null;
  notify();
}

export function subscribeToDisplayMode(callback: Listener) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function getIsStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function getIsStandaloneServerSnapshot() {
  return false;
}
