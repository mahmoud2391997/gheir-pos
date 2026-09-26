export {};

declare global {
  interface Window {
    gheirDesktop?: {
      readStore: () => Promise<Record<string, string>>;
      writeKey: (key: string, value: string | null) => Promise<boolean>;
    };
  }
}
