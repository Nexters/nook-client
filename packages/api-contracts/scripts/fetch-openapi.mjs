import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { openApiPath, toCanonicalJson } from './lib/openapi.mjs';

const sourceUrl = process.env.OPENAPI_SOURCE_URL ?? 'https://api-dev.everynook.co.kr/v3/api-docs';
const checkOnly = process.argv.includes('--check');

const response = await fetch(sourceUrl, {
  headers: {
    accept: 'application/json',
  },
});

if (!response.ok) {
  throw new Error(`Failed to fetch OpenAPI document: ${response.status} ${response.statusText}`);
}

const document = await response.json();

if (!document.openapi || !document.paths || !document.components?.schemas) {
  throw new Error('The response is not a supported OpenAPI document.');
}

const fetchedContent = toCanonicalJson(document);

if (checkOnly) {
  const committedContent = await readFile(openApiPath, 'utf8');

  if (committedContent !== fetchedContent) {
    console.error('The development OpenAPI document differs from the committed snapshot.');
    console.error('Run `pnpm api:fetch && pnpm api:generate`, then commit both outputs.');
    process.exitCode = 1;
  } else {
    console.log('OpenAPI snapshot is up to date.');
  }
} else {
  await mkdir(path.dirname(openApiPath), { recursive: true });
  await writeFile(openApiPath, fetchedContent);
  console.log(`Updated ${path.relative(process.cwd(), openApiPath)}`);
}
