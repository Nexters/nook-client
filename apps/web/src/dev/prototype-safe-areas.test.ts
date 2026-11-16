import { waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { installPrototypeSafeAreas } from './prototype-safe-areas';

it('simulates safe-area env values for both existing and newly rendered iframe elements', async () => {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const doc = frame.contentDocument;
  if (!doc) throw new Error('Missing frame');
  doc.body.innerHTML = '<div style="padding-top: env(safe-area-inset-top)"></div>';
  const controller = installPrototypeSafeAreas(frame);
  try {
    expect(doc.body.firstElementChild?.getAttribute('style')).toContain(
      'var(--prototype-safe-top)',
    );
    const element = doc.createElement('div');
    doc.body.append(element);
    element.setAttribute('style', 'padding-bottom: env(safe-area-inset-bottom)');
    await waitFor(() =>
      expect(element.getAttribute('style')).toContain('var(--prototype-safe-bottom)'),
    );
    expect(doc.documentElement.style.getPropertyValue('--prototype-safe-top')).toBe('54px');
    controller.keyboard(true);
    expect(doc.documentElement.style.getPropertyValue('--prototype-safe-bottom')).toBe('0px');
  } finally {
    controller.dispose();
    frame.remove();
  }
});
