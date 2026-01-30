export const generateUserToken = () => {
  if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `arc-${Math.random().toString(36).slice(2, 10)}-${Date.now()
    .toString(36)
    .slice(-6)}`;
};
