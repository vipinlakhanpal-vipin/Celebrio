// Minimal ambient types for the Contact Picker API
// (https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API).
// Not in TypeScript's built-in DOM lib, and support is currently limited to
// Chrome/Chromium on Android — every call site must feature-detect with
// `"contacts" in navigator` before touching this.
export {};

declare global {
  interface ContactInfo {
    name?: string[];
    email?: string[];
    tel?: string[];
    address?: unknown[];
    icon?: Blob[];
  }

  interface ContactsSelectOptions {
    multiple?: boolean;
  }

  interface ContactsManager {
    select(properties: string[], options?: ContactsSelectOptions): Promise<ContactInfo[]>;
    getProperties(): Promise<string[]>;
  }

  interface Navigator {
    contacts?: ContactsManager;
  }
}
