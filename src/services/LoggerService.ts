import { SettingsService } from "./SettingsService";

export class LoggerService {
  constructor(private settings: SettingsService) {}

  log(method: string, ...args: unknown[]) {
    if (!this.settings.debug) {
      return;
    }
    // Obsidian review disallows console logging; keep a debug gate for call sites.
    void method;
    void args;
  }

  bind(method: string) {
    return (...args: unknown[]) => this.log(method, ...args);
  }
}
