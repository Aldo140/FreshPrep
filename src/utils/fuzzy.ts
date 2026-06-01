/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Fuzzy matching utilities for discount code alignment
 */

/**
 * Computes the minimum Levenshtein Distance (edit distance) between two strings
 */
export function editDistance(a: string, b: string): number {
  const sa = a.toUpperCase().trim();
  const sb = b.toUpperCase().trim();
  
  const dp = Array.from({ length: sa.length + 1 }, () => Array(sb.length + 1).fill(0));
  
  for (let i = 0; i <= sa.length; i++) dp[i][0] = i;
  for (let j = 0; j <= sb.length; j++) dp[0][j] = j;
  
  for (let i = 1; i <= sa.length; i++) {
    for (let j = 1; j <= sb.length; j++) {
      if (sa[i - 1] === sb[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  return dp[sa.length][sb.length];
}

/**
 * Computes a robust score from 0-100 indicating resemblance confidence level
 */
export function calculateConfidence(a: string, b: string): { score: number; tier: "High" | "Medium" | "Low" } {
  const sa = a.toUpperCase().trim();
  const sb = b.toUpperCase().trim();
  
  if (sa === sb) {
    return { score: 100, tier: "High" };
  }
  
  const dist = editDistance(sa, sb);
  const maxLen = Math.max(sa.length, sb.length);
  
  if (maxLen === 0) return { score: 0, tier: "Low" };
  
  // Calculate base score from edit distance relative to longest size
  let score = Math.round((1 - dist / maxLen) * 100);
  
  // Apply a bonus if there is a prefix/suffix match or substring containment
  if (sb.startsWith(sa) || sa.startsWith(sb)) {
    score = Math.min(99, score + 12);
  } else if (sb.includes(sa) || sa.includes(sb)) {
    score = Math.min(99, score + 6);
  }
  
  score = Math.max(5, Math.min(99, score));
  
  let tier: "High" | "Medium" | "Low" = "Low";
  if (score >= 70) {
    tier = "High";
  } else if (score >= 40) {
    tier = "Medium";
  }
  
  return { score, tier };
}

export interface FuzzySuggestionResult {
  code: string;
  score: number;
  tier: "High" | "Medium" | "Low";
}

/**
 * Returns top recommendations paired with confidence ratings
 */
export function getFuzzySuggestionsWithConfidence(target: string, allCodes: string[], maxCount = 3): FuzzySuggestionResult[] {
  if (!target || allCodes.length === 0) return [];
  const query = target.trim().toUpperCase();
  
  const uniqueCodes = Array.from(new Set(allCodes)).filter(c => c.trim().toUpperCase() !== query);
  
  const scored = uniqueCodes.map(code => {
    const confidence = calculateConfidence(query, code);
    return {
      code,
      score: confidence.score,
      tier: confidence.tier
    };
  });
  
  // Sort descending by score, then alphabetically
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.code.localeCompare(b.code);
  });
  
  return scored.slice(0, maxCount);
}

/**
 * Returns a list of similar codes from a dataset based on query similarity
 */
export function getFuzzySuggestions(target: string, allCodes: string[], maxCount = 5): string[] {
  if (!target || allCodes.length === 0) return [];
  
  const query = target.trim().toUpperCase();
  const uniqueCodes = Array.from(new Set(allCodes));
  
  // 1. Direct contains match (e.g., query "MODERN" matches "EVMODERN2026")
  let substringMatches = uniqueCodes.filter(code => {
    const uc = code.toUpperCase();
    return uc.includes(query) || query.includes(uc);
  });
  
  if (substringMatches.length > 0) {
    // Sort by length or matching index
    substringMatches.sort((a, b) => a.length - b.length);
    // If exact query matches exactly one, strip it out from suggestions or keep
    const result = substringMatches.filter(code => code.toUpperCase() !== query);
    if (result.length > 0) {
      return result.slice(0, maxCount);
    }
  }
  
  // 2. Compute similarity score based on edit distance and character overlap
  const scored = uniqueCodes.map(code => {
    const uc = code.toUpperCase();
    
    // Character overlap count
    const querySet = new Set(query);
    let commonCount = 0;
    for (const char of uc) {
      if (querySet.has(char)) commonCount++;
    }
    
    const dist = editDistance(query, uc);
    
    // Score helper: characters shared weighted high, penalizing distance
    // A prefix match gets a bonus
    let score = (commonCount * 2.5) - (dist * 1.5);
    if (uc.startsWith(query) || query.startsWith(uc)) {
      score += 5;
    }
    
    return { code, score };
  });
  
  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  
  return scored
    .slice(0, maxCount)
    .filter(item => item.code.toUpperCase() !== query)
    .map(item => item.code);
}
