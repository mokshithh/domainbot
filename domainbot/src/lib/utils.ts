import { type ClassValue, clsx } from "clsx";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Generate a random bot key like: dbk_xxxxxxxxxxxxxxxx */
export function generateBotKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "dbk_";
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** Format a domain to a clean display string */
export function formatDomain(domain: string): string {
  try {
    return new URL(
      domain.startsWith("http") ? domain : "https://" + domain
    ).hostname;
  } catch {
    return domain;
  }
}

/** Truncate text with ellipsis */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

/** Format date to readable string */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Relative time (e.g. "2 days ago") */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
