import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const openApiPath = path.join(packageDirectory, 'openapi/nook-dev.openapi.json');

function sortRecursively(value) {
  if (Array.isArray(value)) {
    return value.map(sortRecursively);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortRecursively(nestedValue)]),
    );
  }

  return value;
}

export function toCanonicalJson(value) {
  return `${JSON.stringify(sortRecursively(value), null, 2)}\n`;
}
