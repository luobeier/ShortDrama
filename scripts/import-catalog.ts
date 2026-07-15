/* eslint-disable no-console */
// CLI twin of the admin Import tab — same runImport pipeline, same preview.
//
//   npm run import -- data/scraped/reelshort.json            (dry-run preview)
//   npm run import -- data/scraped/reelshort.json --commit   (apply)
//
// Enrichment guards (scraped text must never clobber curated data):
//   --preserve synopsis          on UPDATE rows, drop these fields so the
//                                existing DB value wins (creates keep them)
//   --fields synopsis            project every row to canonicalTitle + these
//                                fields (e.g. restore one column from a file)
//
// Useful when the payload comes from the scraper and pasting into the admin
// textarea is a chore. Unknown keys (e.g. _posterSource) are stripped by the
// row parser, exactly as in the admin.

import { readFileSync } from "fs";
import { runImport, ImportPayloadError } from "../src/lib/adminImport";
import { prisma } from "../src/lib/prisma";

function listArg(args: string[], name: string): string[] {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const commit = args.includes("--commit");
  const preserve = listArg(args, "--preserve");
  const fields = listArg(args, "--fields");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Usage: npm run import -- <file.json> [--commit] [--preserve f1,f2] [--fields f1,f2]");
    process.exit(1);
  }

  let rows: unknown[] = JSON.parse(readFileSync(file, "utf8"));

  if (fields.length && Array.isArray(rows)) {
    rows = rows.map((r) => {
      const o = r as Record<string, unknown>;
      const out: Record<string, unknown> = { canonicalTitle: o.canonicalTitle };
      for (const f of fields) if (o[f] !== undefined) out[f] = o[f];
      return out;
    });
  }

  if (preserve.length && Array.isArray(rows)) {
    // Two passes, same pipeline: plan first to learn which rows are updates,
    // strip the preserved fields from those, then run for real. runImport
    // plans from current DB state both times, so the classification holds.
    const plan = await runImport(rows, { dryRun: true });
    let stripped = 0;
    for (const r of plan.results) {
      if (r.action !== "update") continue;
      const row = rows[r.index] as Record<string, unknown>;
      for (const f of preserve) if (row[f] !== undefined) delete row[f];
      stripped++;
    }
    console.log(`--preserve ${preserve.join(",")}: kept existing values on ${stripped} update row(s)\n`);
  }

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
