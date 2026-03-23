/**
 * URL fetch utility for agent loop.
 *
 * Web search is handled natively by the LLM provider (OpenAI web_search_preview
 * or web_search_options). This module only provides URL fetching for cases where
 * the agent loop needs to read a specific page.
 */
/**
 * Fetch a URL and return its text content.
 * HTML is stripped to plain text. Output is truncated to maxChars.
 */
export declare function fetchUrl(url: string, maxChars?: number): Promise<string>;
//# sourceMappingURL=web-search.d.ts.map