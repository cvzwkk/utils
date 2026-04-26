export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function isAddressSimilar(address1: string, address2: string): boolean {
  if (address1 === address2) return false; // Exact match is not "similar" for poisoning
  
  // Same first 4 and last 4
  if (
    address1.length > 8 &&
    address2.length > 8 &&
    address1.substring(0, 4) === address2.substring(0, 4) &&
    address1.substring(address1.length - 4) === address2.substring(address2.length - 4)
  ) {
    return true;
  }

  // Levenshtein distance
  const distance = levenshteinDistance(address1, address2);
  if (distance > 0 && distance <= 4) {
    return true;
  }

  return false;
}
