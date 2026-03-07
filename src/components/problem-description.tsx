import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/security/sanitize-html";

type ProblemDescriptionProps = {
  className?: string;
  description: string;
  legacyHtmlDescription?: string | null;
};

export function ProblemDescription({
  className,
  description,
  legacyHtmlDescription,
}: ProblemDescriptionProps) {
  if (legacyHtmlDescription && description.trim() === legacyHtmlDescription) {
    return (
      <div
        className={cn("problem-description", className)}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
      />
    );
  }

  return (
    <div className={cn("problem-description", className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        skipHtml
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              className="font-medium text-foreground underline underline-offset-4"
              rel="noreferrer"
              target="_blank"
            />
          ),
        }}
      >
        {description}
      </ReactMarkdown>
    </div>
  );
}
