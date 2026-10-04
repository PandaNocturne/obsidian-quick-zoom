import { SettingsService } from "./SettingsService";

export class LoggerService {
  constructor(private settings: SettingsService) {}

  log(method: string, ...args: unknown[]) {
    if (!this.settings.debug) {
      return;
    }

    console.info(method, ...args);
  }

  bind(method: string) {
    return (...args: unknown[]) => this.log(method, ...args);
  }
}
