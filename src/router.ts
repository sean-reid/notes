import { isId } from "./id.ts";

export type Route = { kind: "write"; id: string | null } | { kind: "list" } | { kind: "unknown" };

export function parseRoute(pathname: string): Route {
  if (pathname === "/") return { kind: "write", id: null };
  if (pathname === "/notes") return { kind: "list" };
  const match = /^\/n\/([0-9a-z]+)$/.exec(pathname);
  if (match && match[1] && isId(match[1])) return { kind: "write", id: match[1] };
  return { kind: "unknown" };
}

export const notePath = (id: string): string => `/n/${id}`;
