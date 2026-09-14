export function isWindowsPath(value: string): boolean {
  if (value.includes('\0') || value.includes('\r') || value.includes('\n')) return false;
  return /^(?:\\\\[^\\/:*?"<>|]+\\[^\\/:*?"<>|]+(?:\\[^:*?"<>|]*)*|[A-Za-z]:\\(?:[^:*?"<>|]+\\?)*[^:*?"<>|]*)$/.test(
    value,
  );
}

export function explorerConnectorUrl(path: string): string {
  return `itsaplan-open://open?path=${encodeURIComponent(path)}`;
}
