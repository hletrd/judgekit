const SEEDED_ADMIN_USERNAME = "admin";
const SEEDED_ADMIN_EMAIL = "admin@example.com";

const legacySeededDescriptionsByTitle = new Map<string, string>([
  [
    "A+B",
    `
      <h3>Problem</h3>
      <p>Given two integers <strong>A</strong> and <strong>B</strong>, print their sum.</p>
      <h3>Input</h3>
      <p>A single line containing two integers separated by a space.</p>
      <h3>Output</h3>
      <p>Print <code>A + B</code>.</p>
      <h3>Example</h3>
      <pre>Input
1 2

Output
3</pre>
    `.trim(),
  ],
  [
    "A-B",
    `
      <h3>Problem</h3>
      <p>Given two integers <strong>A</strong> and <strong>B</strong>, print <code>A - B</code>.</p>
      <h3>Input</h3>
      <p>A single line containing two integers separated by a space.</p>
      <h3>Output</h3>
      <p>Print the difference between the two numbers.</p>
      <h3>Example</h3>
      <pre>Input
7 5

Output
2</pre>
    `.trim(),
  ],
  [
    "A*B",
    `
      <h3>Problem</h3>
      <p>Given two integers <strong>A</strong> and <strong>B</strong>, print their product.</p>
      <h3>Input</h3>
      <p>A single line containing two integers separated by a space.</p>
      <h3>Output</h3>
      <p>Print <code>A × B</code>.</p>
      <h3>Example</h3>
      <pre>Input
3 4

Output
12</pre>
    `.trim(),
  ],
  [
    "Fibonacci",
    `
      <h3>Problem</h3>
      <p>Given a non-negative integer <strong>N</strong>, print the <strong>N</strong>th Fibonacci number.</p>
      <p>Use the definition <code>F(0) = 0</code>, <code>F(1) = 1</code>, and <code>F(n) = F(n-1) + F(n-2)</code> for <code>n ≥ 2</code>.</p>
      <h3>Input</h3>
      <p>A single integer <code>N</code> where <code>0 ≤ N ≤ 40</code>.</p>
      <h3>Output</h3>
      <p>Print the <strong>N</strong>th Fibonacci number.</p>
      <h3>Example</h3>
      <pre>Input
10

Output
55</pre>
    `.trim(),
  ],
  [
    "Factorial",
    `
      <h3>Problem</h3>
      <p>Given a non-negative integer <strong>N</strong>, print <code>N!</code>.</p>
      <h3>Input</h3>
      <p>A single integer <code>N</code> where <code>0 ≤ N ≤ 12</code>.</p>
      <h3>Output</h3>
      <p>Print the factorial of <strong>N</strong>.</p>
      <h3>Example</h3>
      <pre>Input
5

Output
120</pre>
    `.trim(),
  ],
]);

type LegacySeededProblemCandidate = {
  title: string;
  description: string | null;
  authorUsername?: string | null;
  authorEmail?: string | null;
};

export function isTrustedLegacySeededProblem({
  title,
  description,
  authorUsername,
  authorEmail,
}: LegacySeededProblemCandidate) {
  return getTrustedLegacySeededDescription({
    title,
    description,
    authorUsername,
    authorEmail,
  }) !== null;
}

export function getTrustedLegacySeededDescription({
  title,
  description,
  authorUsername,
  authorEmail,
}: LegacySeededProblemCandidate) {
  if (!description) {
    return null;
  }

  const seededDescription = legacySeededDescriptionsByTitle.get(title);

  if (!seededDescription) {
    return null;
  }

  return authorUsername === SEEDED_ADMIN_USERNAME &&
    authorEmail === SEEDED_ADMIN_EMAIL &&
    description.trim() === seededDescription
    ? seededDescription
    : null;
}
