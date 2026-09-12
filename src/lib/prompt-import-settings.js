export function promptImportsEnabled() {
  return String(process.env.PROMPT_IMPORT_ENABLED || "").trim().toLowerCase() === "true";
}
