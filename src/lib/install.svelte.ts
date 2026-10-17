// „App installieren“ (Android/Chrome): Browser-Angebot abfangen und später anbieten.
type InstallPrompt = Event & { prompt: () => Promise<void> };
export const install = $state<{ prompt: InstallPrompt | null }>({ prompt: null });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); install.prompt = e as InstallPrompt; });
export async function runInstall(): Promise<void> {
  await install.prompt?.prompt();
  install.prompt = null;
}
