/* eslint-disable no-console */
// CLI twin of the admin Import tab — same runImport pipeline, same preview.
//
//   npm run import -- data/scraped/reelshort.json            (dry-run preview)
//   npm run import -- data/scraped/reelshort.json --commit   (apply)
//
// Useful when the payload comes from the scraper and pasting into the admin
// textarea is a chore. Unknown keys (e.g. _posterSource) are stripped by the
// row parser, exactly as in the admin.

import { readFileSync } from "fs";
import { runImport, ImportPayloadError } from "../src/lib/adminImport";
import { prisma } from "../src/lib/prisma";

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const commit = args.includes("--commit");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Usage: npm run import -- <file.json> [--commit]");
    process.exit(1);
  }

  const rows = JSON.parse(readFileSync(file, "utf8"));
  const { summary, results } = await runImport(rows, { dryRun: !commit });

  for (const r of results) {
    const tag =
      r.action === "error" ? "✗" : r.action === "create" ? "+" : "~";
    const detail =
      r.action === "error"
        ? r.error
        : [
            r.matchedBy && `matched by ${r.matchedBy}`,
            r.newAliases > 0 && `${r.newAliases} alias(es)`,
            r.newTropes.length > 0 && `new tropes: ${r.newTropes.join(", ")}`,
            ...r.warnings,
          ]
            .filter(Boolean)
            .join("; ");
    console.log(`  ${tag} ${r.title}${detail ? ` — ${detail}` : ""}`);
    if (commit && r.applied === false) console.log(`      write FAILED: ${r.error}`);
  }

  console.log(
    `\n${commit ? "Applied" : "Dry run"}: ${summary.creates} create(s), ` +
      `${summary.updates} update(s), ${summary.errors} error(s), ` +
      `${summary.aliasesAdded} alias(es)` +
      (summary.newTropes.length ? `, new tropes: ${summary.newTropes.join(", ")}` : "")
  );
  if (commit) console.log(`Writes: ${summary.applied} applied, ${summary.failed} failed.`);
  else console.log("Re-run with --commit to apply.");
}

main()
  .catch((e) => {
    if (e instanceof ImportPayloadError) console.error(`Payload error: ${e.message}`);
    else console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
