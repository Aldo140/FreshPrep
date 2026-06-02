import { useCallback } from "react";

export interface CodeFormattingActions {
  cleanEmptyLines: (text: string) => string;
  stripComments: (text: string) => string;
  toUppercase: (text: string) => string;
  sortAlphabetically: (text: string) => string;
  eraseLinesContaining: (text: string, keyword: string) => string;
}

export function useCodeFormatting(): CodeFormattingActions {
  /** Removes blank and whitespace-only lines from text. */
  const cleanEmptyLines = useCallback((text: string): string =>
    text.split("\n").filter(line => line.trim().length > 0).join("\n"), []);

  /**
   * Removes lines that start with comment prefixes: #, //, --, or /\*
   * Does not strip inline comments or multi-line block comments.
   */
  const stripComments = useCallback((text: string): string =>
    text.split("\n").filter(line => {
      const t = line.trim();
      return !t.startsWith("#") && !t.startsWith("//") && !t.startsWith("--") && !t.startsWith("/*");
    }).join("\n"), []);

  /** Converts all text to uppercase. */
  const toUppercase = useCallback((text: string): string => text.toUpperCase(), []);

  /**
   * Sorts non-blank lines alphabetically. Blank lines are silently dropped.
   * Call cleanEmptyLines first if you need to preserve blank line positions.
   */
  const sortAlphabetically = useCallback((text: string): string =>
    text.split("\n").filter(l => l.trim().length > 0).sort((a, b) => a.localeCompare(b)).join("\n"), []);

  /**
   * Removes lines containing the keyword (case-insensitive match).
   * Note: the caller is responsible for resetting the keyword input state
   * after calling this function (the hook does not manage that state).
   */
  const eraseLinesContaining = useCallback((text: string, keyword: string): string => {
    if (!keyword.trim()) return text;
    const query = keyword.trim().toUpperCase();
    return text.split("\n").filter(line => !line.toUpperCase().includes(query)).join("\n");
  }, []);

  return { cleanEmptyLines, stripComments, toUppercase, sortAlphabetically, eraseLinesContaining };
}
