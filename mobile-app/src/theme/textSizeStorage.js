import { TEXT_SIZE_KEY, textSizeOption } from './typography.js';

export function createTextSizeStorage(storage) {
  let pending = Promise.resolve();
  return {
    async load() {
      return textSizeOption(await storage.getItem(TEXT_SIZE_KEY)).id;
    },
    save(id) {
      const next = textSizeOption(id).id;
      // A failed write must not block a retry or a newer preference.
      pending = pending.catch(() => {}).then(() => storage.setItem(TEXT_SIZE_KEY, next));
      return pending;
    },
  };
}
