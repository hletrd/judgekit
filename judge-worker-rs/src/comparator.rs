use memchr::memchr;

/// Trim trailing ASCII whitespace (space, tab, carriage return) from a byte slice.
/// Returns a subslice with no heap allocation.
#[inline]
fn trim_end(line: &[u8]) -> &[u8] {
    let mut end = line.len();
    while end > 0 && matches!(line[end - 1], b' ' | b'\t' | b'\r') {
        end -= 1;
    }
    &line[..end]
}

/// Iterator that yields lines (without the trailing `\n`) from a byte slice.
/// Works with both `\n` and `\r\n` line endings; the `\r` is left in and
/// stripped by `trim_end` during comparison so behavior matches TypeScript's
/// `trimEnd()`.
struct Lines<'a> {
    remaining: &'a [u8],
    done: bool,
}

impl<'a> Lines<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { remaining: data, done: false }
    }
}

impl<'a> Iterator for Lines<'a> {
    type Item = &'a [u8];

    fn next(&mut self) -> Option<Self::Item> {
        if self.done {
            return None;
        }
        match memchr(b'\n', self.remaining) {
            Some(pos) => {
                let line = &self.remaining[..pos];
                self.remaining = &self.remaining[pos + 1..];
                Some(line)
            }
            None => {
                // Last line (no trailing newline)
                self.done = true;
                Some(self.remaining)
            }
        }
    }
}

/// Compare two judge outputs using the same normalization as the TypeScript
/// reference implementation:
///
/// ```text
/// normalize(s) = s.split("\n")
///                 .map(line => line.trimEnd())
///                 .join("\n")
///                 .trim()
/// ```
///
/// The outer `.trim()` means leading *and* trailing blank lines are ignored
/// globally, but only trailing whitespace is removed per-line (leading
/// whitespace on a line is preserved).
///
/// This implementation works directly on `&[u8]` with no heap allocation.
pub fn compare_output(expected: &[u8], actual: &[u8]) -> bool {
    let mut exp_lines = Lines::new(expected).map(trim_end).peekable();
    let mut act_lines = Lines::new(actual).map(trim_end).peekable();

    // Skip leading blank lines (the outer .trim() of the normalized string
    // removes leading blank lines because trimming the joined string removes
    // everything before the first non-whitespace character, which for a
    // multi-line string means leading empty lines).
    while exp_lines.peek() == Some(&b"".as_ref()) {
        exp_lines.next();
    }
    while act_lines.peek() == Some(&b"".as_ref()) {
        act_lines.next();
    }

    loop {
        match (exp_lines.next(), act_lines.next()) {
            (None, None) => return true,
            (Some(e), Some(a)) => {
                if e != a {
                    return false;
                }
            }
            // One side has content, the other is exhausted — check if the
            // remaining lines on the non-exhausted side are all blank (trailing
            // newlines after the last real line).
            (Some(e), None) => {
                if !e.is_empty() {
                    return false;
                }
                return exp_lines.all(|l| l.is_empty());
            }
            (None, Some(a)) => {
                if !a.is_empty() {
                    return false;
                }
                return act_lines.all(|l| l.is_empty());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::compare_output;

    #[test]
    fn exact_match() {
        assert!(compare_output(b"hello\nworld", b"hello\nworld"));
    }

    #[test]
    fn trailing_whitespace_per_line() {
        assert!(compare_output(b"hello   \nworld\t", b"hello\nworld"));
    }

    #[test]
    fn trailing_newlines() {
        assert!(compare_output(b"hello\nworld\n", b"hello\nworld"));
        assert!(compare_output(b"hello\nworld\n\n", b"hello\nworld"));
        assert!(compare_output(b"hello\nworld", b"hello\nworld\n\n\n"));
    }

    #[test]
    fn both_empty() {
        assert!(compare_output(b"", b""));
    }

    #[test]
    fn one_empty_one_whitespace() {
        // TypeScript: normalize("   \n\n  ") == normalize("") == ""
        assert!(compare_output(b"", b"   \n\n  "));
        assert!(compare_output(b"   \n\n  ", b""));
        assert!(compare_output(b"\n\n\n", b""));
        assert!(compare_output(b"", b"\n\n\n"));
    }

    #[test]
    fn different_content() {
        assert!(!compare_output(b"hello", b"world"));
        assert!(!compare_output(b"hello\nworld", b"hello\nearth"));
    }

    #[test]
    fn extra_blank_lines_at_end() {
        assert!(compare_output(b"a\nb\n\n\n", b"a\nb"));
        assert!(compare_output(b"a\nb", b"a\nb\n\n\n"));
    }

    #[test]
    fn windows_line_endings() {
        assert!(compare_output(b"hello\r\nworld\r\n", b"hello\nworld\n"));
        assert!(compare_output(b"hello\r\nworld", b"hello\nworld"));
        // Trailing \r on a line without \n
        assert!(compare_output(b"hello\r", b"hello"));
    }

    #[test]
    fn unicode_content() {
        let exp = "こんにちは\n世界\n".as_bytes();
        let act = "こんにちは\n世界".as_bytes();
        assert!(compare_output(exp, act));

        let exp2 = "héllo\nwörld  \n".as_bytes();
        let act2 = "héllo\nwörld".as_bytes();
        assert!(compare_output(exp2, act2));
    }

    #[test]
    fn large_output() {
        let line = b"the quick brown fox jumps over the lazy dog\n";
        let exp: Vec<u8> = line.repeat(10_000);
        let mut act: Vec<u8> = line.repeat(10_000);
        // Add trailing spaces to each line in `act`
        let act_str: Vec<u8> = act
            .chunks(line.len())
            .flat_map(|l| {
                // l ends with \n; insert two spaces before the newline
                let mut v = l[..l.len() - 1].to_vec();
                v.extend_from_slice(b"  \n");
                v
            })
            .collect();
        act = act_str;
        assert!(compare_output(&exp, &act));

        // Mismatched content should fail fast
        let mut bad = line.repeat(10_000);
        bad[500] = b'X';
        assert!(!compare_output(&exp, &bad));
    }

    #[test]
    fn mixed_trailing_spaces_and_tabs() {
        assert!(compare_output(b"a  \t \nb\t\t", b"a\nb"));
        assert!(!compare_output(b"a  X\nb", b"a\nb"));
    }

    #[test]
    fn single_line_match() {
        assert!(compare_output(b"42", b"42"));
        assert!(compare_output(b"42\n", b"42"));
        assert!(compare_output(b"42   ", b"42"));
    }

    #[test]
    fn single_line_mismatch() {
        assert!(!compare_output(b"42", b"43"));
        assert!(!compare_output(b"42", b"420"));
        assert!(!compare_output(b"420", b"42"));
    }

    #[test]
    fn internal_blank_lines_preserved() {
        // Internal blank lines are significant — must NOT be collapsed
        assert!(compare_output(b"a\n\nb", b"a\n\nb"));
        assert!(!compare_output(b"a\n\n\nb", b"a\n\nb"));
        assert!(!compare_output(b"a\n\nb", b"a\n\n\nb"));
        assert!(!compare_output(b"a\nb", b"a\n\nb"));
        assert!(!compare_output(b"a\n\nb", b"a\nb"));
    }
}
