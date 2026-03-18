#!/usr/bin/env python3
"""Whitespace language interpreter for competitive programming judge.

Implements the full Whitespace specification:
  https://web.archive.org/web/20150623025348/http://compsoc.dur.ac.uk/whitespace/tutorial.php

Only space (0x20), tab (0x09), and line-feed (0x0A) are meaningful;
all other characters are ignored.

Number input uses scanf-style parsing (skip whitespace, read optional sign
and digits) so that space-separated integers on a single line work correctly
in a competitive-programming context.
"""

from __future__ import annotations

import sys


def _parse(source: str) -> list[tuple[str, int | list[int] | None]]:
    """Parse source into a list of (opcode, argument) tuples."""
    tokens = [c for c in source if c in " \t\n"]
    n = len(tokens)
    pos = 0

    def peek() -> str:
        return tokens[pos] if pos < n else ""

    def advance() -> str:
        nonlocal pos
        ch = tokens[pos]
        pos += 1
        return ch

    def read_number() -> int:
        sign = 1 if advance() == " " else -1
        bits: list[int] = []
        while pos < n:
            ch = advance()
            if ch == "\n":
                break
            bits.append(0 if ch == " " else 1)
        if not bits:
            return 0
        value = 0
        for b in bits:
            value = (value << 1) | b
        return sign * value

    def read_label() -> list[int]:
        label: list[int] = []
        while pos < n:
            ch = advance()
            if ch == "\n":
                break
            label.append(0 if ch == " " else 1)
        return label

    instructions: list[tuple[str, int | list[int] | None]] = []

    while pos < n:
        imp = advance()
        if imp == " ":
            # Stack manipulation
            cmd = advance()
            if cmd == " ":
                instructions.append(("push", read_number()))
            elif cmd == "\n":
                sub = advance()
                if sub == " ":
                    instructions.append(("dup", None))
                elif sub == "\t":
                    instructions.append(("swap", None))
                elif sub == "\n":
                    instructions.append(("discard", None))
            elif cmd == "\t":
                sub = advance()
                if sub == " ":
                    instructions.append(("copy", read_number()))
                elif sub == "\n":
                    instructions.append(("slide", read_number()))
        elif imp == "\t":
            imp2 = advance()
            if imp2 == " ":
                # Arithmetic
                cmd = advance()
                cmd2 = advance()
                op = cmd + cmd2
                ops = {
                    "  ": "add",
                    " \t": "sub",
                    " \n": "mul",
                    "\t ": "div",
                    "\t\t": "mod",
                }
                if op in ops:
                    instructions.append((ops[op], None))
            elif imp2 == "\t":
                # Heap access
                cmd = advance()
                if cmd == " ":
                    instructions.append(("store", None))
                elif cmd == "\t":
                    instructions.append(("retrieve", None))
            elif imp2 == "\n":
                # I/O
                cmd = advance()
                cmd2 = advance()
                op = cmd + cmd2
                ios = {
                    "  ": "outchar",
                    " \t": "outnum",
                    "\t ": "readchar",
                    "\t\t": "readnum",
                }
                if op in ios:
                    instructions.append((ios[op], None))
        elif imp == "\n":
            # Flow control
            cmd = advance()
            if cmd == " ":
                sub = advance()
                if sub == " ":
                    instructions.append(("label", read_label()))
                elif sub == "\t":
                    instructions.append(("call", read_label()))
                elif sub == "\n":
                    instructions.append(("jmp", read_label()))
            elif cmd == "\t":
                sub = advance()
                if sub == " ":
                    instructions.append(("jz", read_label()))
                elif sub == "\t":
                    instructions.append(("jn", read_label()))
                elif sub == "\n":
                    instructions.append(("ret", None))
            elif cmd == "\n":
                sub = advance()
                if sub == "\n":
                    instructions.append(("end", None))

    return instructions


class _StdinReader:
    """Buffered stdin reader that supports scanf-style number parsing."""

    def __init__(self, stream: object = None) -> None:
        self._buf = ""
        self._stream = stream if stream is not None else sys.stdin

    def _fill(self) -> bool:
        chunk = self._stream.read(4096)  # type: ignore[union-attr]
        if not chunk:
            return False
        self._buf += chunk
        return True

    def read_number(self) -> int:
        # Skip whitespace, then read optional sign and digits
        while True:
            # Skip whitespace in buffer
            i = 0
            while i < len(self._buf) and self._buf[i] in " \t\n\r":
                i += 1
            self._buf = self._buf[i:]
            if self._buf:
                break
            if not self._fill():
                raise EOFError("unexpected end of input")

        # Read sign and digits
        while len(self._buf) < 32:
            if not self._fill():
                break

        i = 0
        if i < len(self._buf) and self._buf[i] in "+-":
            i += 1
        while i < len(self._buf) and self._buf[i].isdigit():
            i += 1

        if i == 0 or (i == 1 and self._buf[0] in "+-"):
            raise ValueError(f"invalid number in input: {self._buf[:20]!r}")

        num_str = self._buf[:i]
        self._buf = self._buf[i:]
        return int(num_str)

    def read_char(self) -> int:
        while not self._buf:
            if not self._fill():
                raise EOFError("unexpected end of input")
        ch = self._buf[0]
        self._buf = self._buf[1:]
        return ord(ch)


def run(source: str) -> None:
    instructions = _parse(source)
    if not instructions:
        return

    # Build label map
    label_map: dict[str, int] = {}
    for i, (op, arg) in enumerate(instructions):
        if op == "label":
            key = str(arg)
            label_map[key] = i

    stack: list[int] = []
    heap: dict[int, int] = {}
    call_stack: list[int] = []
    reader = _StdinReader()
    pc = 0
    max_steps = 10_000_000

    for _ in range(max_steps):
        if pc >= len(instructions):
            break

        op, arg = instructions[pc]
        pc += 1

        if op == "push":
            stack.append(arg)  # type: ignore[arg-type]
        elif op == "dup":
            if not stack:
                raise RuntimeError("stack underflow on dup")
            stack.append(stack[-1])
        elif op == "copy":
            idx = arg  # type: ignore[assignment]
            if idx < 0 or idx >= len(stack):
                raise RuntimeError(f"copy index {idx} out of range")
            stack.append(stack[-(idx + 1)])
        elif op == "swap":
            if len(stack) < 2:
                raise RuntimeError("stack underflow on swap")
            stack[-1], stack[-2] = stack[-2], stack[-1]
        elif op == "discard":
            if not stack:
                raise RuntimeError("stack underflow on discard")
            stack.pop()
        elif op == "slide":
            n_slide = arg  # type: ignore[assignment]
            if len(stack) < n_slide + 1:
                raise RuntimeError("stack underflow on slide")
            top = stack.pop()
            for _ in range(n_slide):
                stack.pop()
            stack.append(top)
        elif op == "add":
            b, a = stack.pop(), stack.pop()
            stack.append(a + b)
        elif op == "sub":
            b, a = stack.pop(), stack.pop()
            stack.append(a - b)
        elif op == "mul":
            b, a = stack.pop(), stack.pop()
            stack.append(a * b)
        elif op == "div":
            b, a = stack.pop(), stack.pop()
            if b == 0:
                raise RuntimeError("division by zero")
            # Python integer division truncates toward negative infinity;
            # Whitespace spec uses truncation toward zero (C-style).
            stack.append(int(a / b))
        elif op == "mod":
            b, a = stack.pop(), stack.pop()
            if b == 0:
                raise RuntimeError("modulo by zero")
            # C-style modulo (sign follows dividend)
            stack.append(a - int(a / b) * b)
        elif op == "store":
            val = stack.pop()
            addr = stack.pop()
            heap[addr] = val
        elif op == "retrieve":
            addr = stack.pop()
            stack.append(heap.get(addr, 0))
        elif op == "label":
            pass  # labels are pre-scanned
        elif op == "call":
            key = str(arg)
            if key not in label_map:
                raise RuntimeError(f"undefined label: {key}")
            call_stack.append(pc)
            pc = label_map[key]
        elif op == "jmp":
            key = str(arg)
            if key not in label_map:
                raise RuntimeError(f"undefined label: {key}")
            pc = label_map[key]
        elif op == "jz":
            val = stack.pop()
            if val == 0:
                key = str(arg)
                if key not in label_map:
                    raise RuntimeError(f"undefined label: {key}")
                pc = label_map[key]
        elif op == "jn":
            val = stack.pop()
            if val < 0:
                key = str(arg)
                if key not in label_map:
                    raise RuntimeError(f"undefined label: {key}")
                pc = label_map[key]
        elif op == "ret":
            if not call_stack:
                raise RuntimeError("call stack underflow on ret")
            pc = call_stack.pop()
        elif op == "end":
            return
        elif op == "outchar":
            sys.stdout.write(chr(stack.pop()))
            sys.stdout.flush()
        elif op == "outnum":
            sys.stdout.write(str(stack.pop()))
            sys.stdout.flush()
        elif op == "readchar":
            addr = stack.pop()
            heap[addr] = reader.read_char()
        elif op == "readnum":
            addr = stack.pop()
            heap[addr] = reader.read_number()
    else:
        raise RuntimeError("execution limit exceeded (possible infinite loop)")


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <file.ws>", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1]) as f:
        source = f.read()

    try:
        run(source)
    except (RuntimeError, EOFError, IndexError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
