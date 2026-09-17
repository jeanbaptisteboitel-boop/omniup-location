/** Configuration de l'assistant IA (lisible côté serveur, sans importer le SDK). */
export const MODELE_IA_DEFAUT = "claude-opus-5";

export function iaConfiguree(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function modeleIA(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || MODELE_IA_DEFAUT;
}
