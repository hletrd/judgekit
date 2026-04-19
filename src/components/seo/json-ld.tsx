type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

/**
 * Sanitize JSON string for safe embedding in a <script> tag.
 * `JSON.stringify` escapes `<` in V8/SpiderMonkey but this is not
 * guaranteed by the ECMAScript spec. Replace `</script` sequences
 * to prevent breaking out of the script tag.
 */
function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonForScript(data) }}
    />
  );
}
