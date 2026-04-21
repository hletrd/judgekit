/**
 * Shared clipboard copy utility with fallback for restricted environments.
 *
 * Tries the Clipboard API first, falls back to `document.execCommand("copy")`
 * for older browsers or restricted contexts (non-HTTPS, iframe).
 *
 * @returns `true` if the copy succeeded, `false` if it failed.
 *          The caller is responsible for showing success/error feedback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable (non-HTTPS, iframe, permissions denied).
    // Fall back to the execCommand approach.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    const ok = document.execCommand("copy");
    if (!ok) {
      return false;
    }
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }

  return true;
}
