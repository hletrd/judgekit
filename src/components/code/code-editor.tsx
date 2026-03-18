import dynamic from "next/dynamic";
import { CodeEditorSkeleton } from "./code-editor-skeleton";
import { RAW_TEXTAREA_LANGUAGES } from "@/lib/code/language-map";
import { cn } from "@/lib/utils";

const CodeSurface = dynamic(
  () => import("./code-surface").then((m) => ({ default: m.CodeSurface })),
  { ssr: false, loading: () => <CodeEditorSkeleton minHeight={300} /> }
);

type CodeEditorProps = {
  ariaLabel?: string;
  ariaLabelledby?: string;
  className?: string;
  id?: string;
  language?: string | null;
  minHeight?: number;
  onValueChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function CodeEditor(props: CodeEditorProps) {
  const { minHeight, onValueChange, ...surfaceProps } = props;
  const height = minHeight ?? 300;

  if (props.language && RAW_TEXTAREA_LANGUAGES.has(props.language)) {
    return (
      <textarea
        id={props.id}
        aria-label={props.ariaLabel}
        aria-labelledby={props.ariaLabelledby}
        className={cn(
          "code-surface code-surface-default w-full overflow-auto rounded-xl border bg-[var(--code-surface-background)] p-4 font-mono text-sm text-[var(--code-surface-foreground)] leading-relaxed shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15 focus:outline-none",
          props.className,
        )}
        style={{ minHeight: height, tabSize: 4, whiteSpace: "pre", resize: "vertical" }}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => onValueChange(e.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
    );
  }

  return (
    <CodeSurface
      {...surfaceProps}
      minHeight={height}
      onValueChangeAction={onValueChange}
    />
  );
}
