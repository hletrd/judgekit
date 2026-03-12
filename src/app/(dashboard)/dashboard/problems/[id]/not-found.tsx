import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="rounded-lg border p-6 text-center max-w-md">
        <h2 className="text-lg font-semibold mb-2">Not Found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The requested resource could not be found.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
