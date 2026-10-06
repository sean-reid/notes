import type { NoteStore } from "./store.ts";

export interface App {
  store: NoteStore;
  main: HTMLElement;
  menu: HTMLElement;
  navigate(path: string): void;
}

export type Teardown = () => void | Promise<void>;
