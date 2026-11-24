/** "A, B, C and D" (at most four names, then "and N more"). */
export function listNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  const shown = names.slice(0, 4);
  const rest = names.length - shown.length;
  return rest > 0
    ? `${shown.join(", ")} and ${rest} more`
    : `${shown.slice(0, -1).join(", ")} & ${shown[shown.length - 1]}`;
}
