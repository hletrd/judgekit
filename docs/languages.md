# Supported Languages (55 variants)

44 Docker images covering 55 language variants.

| # | Language ID | Description | Docker Image |
|---|-------------|-------------|--------------|
| 1 | `c89` | C (C89, GCC) | `judge-cpp` |
| 2 | `c99` | C (C99, GCC) | `judge-cpp` |
| 3 | `c17` | C (C17, GCC) | `judge-cpp` |
| 4 | `c23` | C (C23, GCC) | `judge-cpp` |
| 5 | `cpp20` | C++ (C++20, GCC) | `judge-cpp` |
| 6 | `cpp23` | C++ (C++23, GCC) | `judge-cpp` |
| 7 | `clang_c23` | C (C23, Clang) | `judge-clang` |
| 8 | `clang_cpp23` | C++ (C++23, Clang) | `judge-clang` |
| 9 | `java` | Java 25 | `judge-jvm` |
| 10 | `kotlin` | Kotlin 2.3 | `judge-jvm` |
| 11 | `python` | Python 3.14 | `judge-python` |
| 12 | `javascript` | Node.js 24 | `judge-node` |
| 13 | `typescript` | TypeScript 5.9 | `judge-node` |
| 14 | `rust` | Rust 1.94 | `judge-rust` |
| 15 | `go` | Go 1.26 | `judge-go` |
| 16 | `swift` | Swift 6.2 | `judge-swift` |
| 17 | `csharp` | C# (Mono 6.12) | `judge-csharp` |
| 18 | `r` | R 4.5 | `judge-r` |
| 19 | `perl` | Perl 5.40 | `judge-perl` |
| 20 | `php` | PHP 8.4 | `judge-php` |
| 21 | `ruby` | Ruby 3.4 | `judge-ruby` |
| 22 | `lua` | Lua 5.4 | `judge-lua` |
| 23 | `haskell` | Haskell (GHC 9.4) | `judge-haskell` |
| 24 | `dart` | Dart 3.8 | `judge-dart` |
| 25 | `zig` | Zig 0.13 | `judge-zig` |
| 26 | `nim` | Nim 2.2 | `judge-nim` |
| 27 | `ocaml` | OCaml 4.14 | `judge-ocaml` |
| 28 | `elixir` | Elixir 1.18 | `judge-elixir` |
| 29 | `julia` | Julia 1.12 | `judge-julia` |
| 30 | `d` | D (LDC 1.39) | `judge-d` |
| 31 | `racket` | Racket 8.10 | `judge-racket` |
| 32 | `vlang` | V 0.5 | `judge-v` |
| 33 | `fortran` | Fortran (GFortran 14) | `judge-fortran` |
| 34 | `pascal` | Pascal (FPC 3.2) | `judge-pascal` |
| 35 | `cobol` | COBOL (GnuCOBOL 3.2) | `judge-cobol` |
| 36 | `scala` | Scala 3.5 | `judge-scala` |
| 37 | `erlang` | Erlang 27 | `judge-erlang` |
| 38 | `commonlisp` | Common Lisp (SBCL 2.5) | `judge-commonlisp` |
| 39 | `bash` | Bash 5.2 | `judge-bash` |
| 40 | `ada` | Ada (GNAT 14) | `judge-ada` |
| 41 | `clojure` | Clojure 1.12 | `judge-clojure` |
| 42 | `prolog` | Prolog (SWI-Prolog 9) | `judge-prolog` |
| 43 | `tcl` | Tcl 8.6 | `judge-tcl` |
| 44 | `awk` | AWK (GAWK 5) | `judge-awk` |
| 45 | `scheme` | Scheme (Chicken 5) | `judge-scheme` |
| 46 | `groovy` | Groovy 4.0 | `judge-groovy` |
| 47 | `octave` | GNU Octave 9 | `judge-octave` |
| 48 | `crystal` | Crystal 1.14 | `judge-crystal` |
| 49 | `powershell` | PowerShell 7.5 | `judge-powershell` |
| 50 | `postscript` | PostScript (Ghostscript 10) | `judge-postscript` |
| 51 | `brainfuck` | Brainfuck | `judge-brainfuck` |
| 52 | `befunge` | Befunge-93 | `judge-esoteric` |
| 53 | `aheui` | Aheui | `judge-esoteric` |
| 54 | `hyeong` | Hyeong | `judge-esoteric` |
| 55 | `whitespace` | Whitespace | `judge-esoteric` |

51/55 pass the E2E A+B test. 4 known flaky: Hyeong (line-based I/O), Brainfuck (byte-level I/O), V (build issues), Whitespace (encoding).

## Docker Image Presets

| Preset | Languages | Est. Size |
|--------|-----------|-----------|
| `core` | C/C++, Python, Java/Kotlin | ~0.8 GB |
| `popular` | Core + Node.js, Rust, Go | ~2.5 GB |
| `extended` | Popular + Ruby, Lua, Bash, C#, PHP, Perl, Swift, R, Haskell, Dart, Zig | ~8 GB |
| `all` | All 44 images | ~14 GB |

## Admin Language Management

`/dashboard/admin/languages` lets admins override per-language settings at runtime:
- Docker image name, compile command, run command
- Enable/disable toggle
- Build and remove Docker images from the UI

Changes take effect immediately for new submissions without restarting services.
