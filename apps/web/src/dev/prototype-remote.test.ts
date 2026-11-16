import { describe, expect, it } from 'vitest';
import { prototypeRemotePage } from './prototype-remote';

describe('page-specific QA controls', () => {
  it.each(['/archive', '/archive/1'])('uses archive controls on %s', (path) =>
    expect(prototypeRemotePage(path)).toBe('archive'),
  );
  it.each(['/map', '/map/places/1'])('uses map controls on %s', (path) =>
    expect(prototypeRemotePage(path)).toBe('map'),
  );
  it('hides unrelated controls on My', () => expect(prototypeRemotePage('/my')).toBeNull());
});

it('hides page controls on post detail', () => expect(prototypeRemotePage('/post/1')).toBeNull());
