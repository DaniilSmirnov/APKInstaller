export {};

declare global {
  interface Window {
    electron: {
      app: {
        getVersion: () => Promise<string>;
      };
    };
  }
}
