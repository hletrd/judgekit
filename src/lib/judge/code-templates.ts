/**
 * Default code templates for competitive programming languages.
 * Preloaded into the editor when a user selects a language and the editor is empty.
 */

export const DEFAULT_TEMPLATES: Record<string, string> = {
  c: `#include <stdio.h>

int main(void) {

    return 0;
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main(void) {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}`,
  cpp17: `#include <bits/stdc++.h>
using namespace std;

int main(void) {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}`,
  cpp20: `#include <bits/stdc++.h>
using namespace std;

int main(void) {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}`,
  python: `import sys
input = sys.stdin.readline

def main():
    pass

if __name__ == "__main__":
    main()`,
  python3: `import sys
input = sys.stdin.readline

def main():
    pass

if __name__ == "__main__":
    main()`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st;

    }
}`,
  kotlin: "import java.io.*\nimport java.util.*\n\nfun main() {\n    val br = BufferedReader(InputStreamReader(System.`in`))\n\n}",
  rust: `use std::io::{self, BufRead, Write, BufWriter};

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());

    let mut lines = stdin.lock().lines();
}
`,
  go: `package main

import (
\t"bufio"
\t"fmt"
\t"os"
)

func main() {
\treader := bufio.NewReader(os.Stdin)
\twriter := bufio.NewWriter(os.Stdout)
\tdefer writer.Flush()

\t_ = reader
}`,
  csharp: `using System;
using System.IO;

class Program {
    static void Main() {

    }
}`,
  ruby: `$stdin.each_line do |line|

end
`,
  swift: `import Foundation

let input = readLine()!
`,
  javascript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

const lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {

});
`,
  typescript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

const lines: string[] = [];
rl.on('line', (line: string) => lines.push(line));
rl.on('close', () => {

});
`,
  pascal: `program Main;
begin

end.
`,
  php: `<?php
fscanf(STDIN, "%d", $n);
`,
};

/**
 * Check if the current editor content is effectively empty or
 * matches a known template (meaning the user hasn't written anything).
 */
export function isTemplateLike(code: string): boolean {
  const trimmed = code.trim();
  if (trimmed.length === 0) return true;

  // Check if it matches any existing template (ignoring whitespace)
  for (const tmpl of Object.values(DEFAULT_TEMPLATES)) {
    if (tmpl.trim() === trimmed) return true;
  }

  return false;
}
