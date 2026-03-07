export function compareOutput(expected: string, actual: string): boolean {
  // Normalize: trim trailing whitespace/newlines from each line and the whole string
  const normalize = (s: string) =>
    s.split("\n").map(line => line.trimEnd()).join("\n").trim();

  return normalize(expected) === normalize(actual);
}
