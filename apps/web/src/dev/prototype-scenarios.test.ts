import { expect, it } from 'vitest';
import { createPrototypeScenarioData } from './prototype-scenarios';

it.each([
  ['multi-tags', 6, 4],
  ['multi-empty', 6, 0],
  ['single-tags', 1, 4],
  ['single-empty', 1, 0],
  ['none-tags', 0, 4],
  ['none-empty', 0, 0],
] as const)(
  '%s starts with the requested photos and tags without changing other places',
  (id, photos, tags) => {
    const data = createPrototypeScenarioData(id);
    const place = data.places[0];
    expect(place?.photoUrls).toHaveLength(photos);
    expect(place?.tags).toHaveLength(tags);
    expect(data.places).toHaveLength(30);
    expect(data.places[1]?.thumbnailUrl).toBeTruthy();
    if (photos === 0) expect(place?.thumbnailUrl).toBeNull();
  },
);

it('puts the first place in the "성수" search results only for the multi-card mode', () => {
  expect(createPrototypeScenarioData('multi-tags', 'multi').places[0]?.address).toContain('성수');
  expect(createPrototypeScenarioData('multi-tags', 'single').places[0]?.address).not.toContain(
    '성수',
  );
});
