// Rotate the Supabase database password in .env without hand-editing.
// Run it in YOUR terminal (it prompts; nothing is echoed to logs):
//
//   node scripts/set-db-password.mjs
//
// It URL-encodes special characters and rewrites the password segment of
// both DATABASE_URL and DIRECT_URL in place. .env stays gitignored.

import { readFileSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const ENV_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("New Supabase database password: ", (raw) => {
  rl.close();
  const pw = raw.trim();
  if (!pw) {
    console.error("Empty password — nothing changed.");
    process.exit(1);
  }
  if (/^\[.*\]$/.test(pw)) {
    console.error("That still has [brackets] around it — paste just the password itself.");
    process.exit(1);
  }
  const encoded = encodeURIComponent(pw);

  let env = readFileSync(ENV_PATH, "utf8");
  const pattern = /(postgres(?:ql)?:\/\/postgres\.[a-z0-9]+:)([^@]+)(@)/g;
  const count = (env.match(pattern) ?? []).length;
  if (count === 0) {
    console.error("No Supabase connection strings found in .env — nothing changed.");
    process.exit(1);
  }
  env = env.replace(pattern, `$1${encoded}$3`);
  writeFileSync(ENV_PATH, env);
  console.log(
    `✓ Password updated in ${count} connection string(s)` +
      (encoded !== pw ? " (special characters URL-encoded)" : "") +
      ". Restart the dev server to pick it up."
  );
});
