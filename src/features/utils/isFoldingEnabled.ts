import { App, Vault } from "obsidian";

type VaultConfig = {
  foldHeading?: boolean;
  foldIndent?: boolean;
};

export function isFoldingEnabled(app: App) {
  const vaultConfig =
    (app.vault as Vault & { config?: VaultConfig }).config ?? {};
  const config = {
    foldHeading: true,
    foldIndent: true,
    ...vaultConfig,
  };

  return Boolean(config.foldHeading && config.foldIndent);
}
