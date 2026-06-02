import { useCallback } from "react";

export interface CodeFormattingActions {
  cleanEmptyLines: (text: string) => string;
  stripComments: (text: string) => string;
  toUppercase: (text: string) => string;
  sortAlphabetically: (text: string) => string;
  eraseLinesContaining: (text: string, keyword: string) => string;
}

export function useCodeFormatting(): CodeFormattingActions {
  const cleanEmptyLines = useCallback((text: string): string =>
    text.split("\n").filter(line => line.trim().length > 0).join("\n"), []);

  const stripComments = useCallback((text: string): string =>
    text.split("\n").filter(line => {
      const t = line.trim();
      return !t.startsWith("#") && !t.startsWith("//") && !t.startsWith("--") && !t.startsWith("/*");
    }).join("\n"), []);

  const toUppercase = useCallback((text: string): string => text.toUpperCase(), []);

  const sortAlphabetically = useCallback((text: string): string =>
    text.split("\n").filter(l => l.trim().length > 0).sort((a, b) => a.localeCompare(b)).join("\n"), []);

  const eraseLinesContaining = useCallback((text: string, keyword: string): string => {
    if (!keyword.trim()) return text;
    const query = keyword.trim().toUpperCase();
    return text.split("\n").filter(line => !line.toUpperCase().includes(query)).join("\n");
  }, []);

  return { cleanEmptyLines, stripComments, toUppercase, sortAlphabetically, eraseLinesContaining };
}
