// Share the same real UI input driver; isolate this report from the two travel routes.
process.env.KILN_ROUTE='consequences';
process.env.KILN_CONSEQUENCE_CASE='all';
process.env.KILN_OUTPUT='qa/evidence/kiln-consequences.json';
await import('./kiln-check.mjs');
