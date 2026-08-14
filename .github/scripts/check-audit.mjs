// Fails CI when `pnpm audit --prod --json` reports a high/critical advisory that is not in the
// reviewed allowlist below. Keeps the security gate meaningful (new highs still block) while
// allowing documented, justified exceptions.
//
// Usage: pnpm audit --prod --json > audit.json || true && node .github/scripts/check-audit.mjs
import { readFileSync } from 'node:fs';

// GHSAs reviewed and accepted as not applicable to this client-side browser extension.
// Each entry MUST have a justification. Re-review whenever dependencies change.
const ALLOWLIST = new Map([
	[
		'GHSA-qwww-vcr4-c8h2',
		'React Router RSC-mode CSRF bypass — patched only in react-router 8.x; this extension is ' +
			'a client-side SPA that does not use RSC/framework mode, so the vulnerability cannot apply.',
	],
]);

const BLOCKING = new Set(['high', 'critical']);

let report;
try {
	report = JSON.parse(readFileSync('audit.json', 'utf8'));
} catch (err) {
	console.error(`Could not read/parse audit.json: ${err.message}`);
	process.exit(2);
}

const advisories = Object.values(report.advisories ?? {});
const blocking = [];

for (const a of advisories) {
	const id = a.github_advisory_id ?? String(a.id);
	const allowReason = ALLOWLIST.get(id);
	if (BLOCKING.has(a.severity) && allowReason) {
		console.log(`ALLOWED  ${a.severity.padEnd(8)} ${id}  ${a.module_name} — ${a.title}`);
		console.log(`         ↳ ${allowReason}`);
	} else if (BLOCKING.has(a.severity)) {
		blocking.push(a);
		console.log(`BLOCKING ${a.severity.padEnd(8)} ${id}  ${a.module_name} — ${a.title}`);
	} else {
		console.log(`info     ${a.severity.padEnd(8)} ${id}  ${a.module_name} — ${a.title}`);
	}
}

if (blocking.length > 0) {
	console.error(`\n${blocking.length} blocking high/critical advisory(ies) found. Failing.`);
	process.exit(1);
}
console.log('\nNo blocking high/critical advisories (allowlisted exceptions ignored).');
