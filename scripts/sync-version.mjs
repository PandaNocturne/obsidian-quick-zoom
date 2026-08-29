import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
manifest.version = version;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions["1.0.2"] = "1.1.16";
versions["1.0.1"] = "1.1.16";
versions["1.0.0"] = "1.1.16";

const next = { [version]: manifest.minAppVersion };
for (const [key, value] of Object.entries(versions)) {
  if (key !== version) {
    next[key] = value;
  }
}
writeFileSync("versions.json", JSON.stringify(next, null, 2) + "\n");
