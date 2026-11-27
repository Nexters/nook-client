import { beforeEach, expect, it } from 'vitest';
import { readArchiveView } from './viewPreferences';

beforeEach(() => localStorage.clear());

it('아카이브별로 따로 읽고, 없거나 깨진 값은 기본형 2열·최신순으로 돌아간다', () => {
  localStorage.setItem('nook.archive-view.v1.1', JSON.stringify({ view: 'feed', sort: 'OLDEST' }));
  expect(readArchiveView('1')).toEqual({ view: 'feed', sort: 'OLDEST' });
  expect(readArchiveView('2')).toEqual({ view: 'grid', sort: 'LATEST' });
  localStorage.setItem('nook.archive-view.v1.1', '{');
  expect(readArchiveView('1')).toEqual({ view: 'grid', sort: 'LATEST' });
});
