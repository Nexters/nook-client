import { beforeEach, expect, it } from 'vitest';
import { readArchiveView } from './viewPreferences';

beforeEach(() => localStorage.clear());
it('isolates preferences by archive and recovers malformed values', () => {
  localStorage.setItem('nook.archive-view.v1.1', JSON.stringify({ view: 'feed', sort: 'OLDEST' }));
  expect(readArchiveView('1')).toEqual({ view: 'feed', sort: 'OLDEST' });
  expect(readArchiveView('2')).toEqual({ view: 'grid', sort: 'LATEST' });
  localStorage.setItem('nook.archive-view.v1.1', '{');
  expect(readArchiveView('1')).toEqual({ view: 'grid', sort: 'LATEST' });
});
