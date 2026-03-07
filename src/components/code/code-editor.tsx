import { CodeSurface } from "./code-surface";

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

  return (
    <CodeSurface
      {...surfaceProps}
      minHeight={minHeight ?? 300}
      onValueChangeAction={onValueChange}
    />
  );
}
