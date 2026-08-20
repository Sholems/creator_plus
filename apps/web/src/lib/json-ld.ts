/**
 * Safely serialize a JSON-LD object for embedding in a <script type="application/ld+json">
 * tag via dangerouslySetInnerHTML.
 *
 * JSON.stringify does NOT escape < > or &, so any user-controlled field (a
 * product title, a store name, a category name) containing </script> or an
 * HTML tag would break out of the script element and execute as markup — a
 * stored-XSS vector on every page that renders JSON-LD from database content.
 *
 * Escaping them as \uXXXX JSON escapes keeps the payload valid JSON-LD (it
 * parses back to the identical string) while making it impossible to terminate
 * the surrounding <script> or inject a tag. U+2028/U+2029 are escaped too.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
