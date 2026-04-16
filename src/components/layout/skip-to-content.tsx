export function SkipToContent({ targetId = "main-content", label }: { targetId?: string; label: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md dark:focus:bg-foreground dark:focus:text-background"
    >
      {label}
    </a>
  );
}
