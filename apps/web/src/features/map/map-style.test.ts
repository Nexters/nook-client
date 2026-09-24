import { describe, expect, it, vi } from 'vitest';
import { buildNaverMapStyleProps, RASTER_OVERLAY_TYPE, resolveMapStyle } from './map-style';

describe('resolveMapStyle', () => {
  it('스타일 ID 가 있으면 GL 벡터맵 + 커스텀 스타일이다', () => {
    expect(resolveMapStyle(' 94230366-adba-4e0e-ac5a-e82a0e137b5e ')).toEqual({
      mode: 'gl',
      gl: true,
      customStyleId: '94230366-adba-4e0e-ac5a-e82a0e137b5e',
    });
  });

  it('스타일 ID 가 비면 라벨을 뺀 래스터 타일로 폴백한다', () => {
    expect(resolveMapStyle('')).toEqual({ mode: 'raster', overlayType: RASTER_OVERLAY_TYPE });
    expect(resolveMapStyle('   ')).toEqual({ mode: 'raster', overlayType: RASTER_OVERLAY_TYPE });
  });

  it('래스터 폴백은 배경·도로·지하철 노선만 요청하고 라벨(lko)은 요청하지 않는다', () => {
    const layers = RASTER_OVERLAY_TYPE.split('.');
    expect(layers).toEqual(expect.arrayContaining(['bg', 'ol', 'sw']));
    expect(layers).not.toContain('lko');
  });
});

describe('buildNaverMapStyleProps', () => {
  const getNormalMap = vi.fn((opts: { overlayType: string }) => ({ kind: 'normal', ...opts }));
  class MapTypeRegistry {
    constructor(public types: Record<string, unknown>) {}
  }
  const navermaps = {
    MapTypeRegistry,
    NaverStyleMapTypeOptions: { getNormalMap },
  } as unknown as typeof naver.maps;

  it('gl 모드는 gl·customStyleId 만 넘기고 mapTypes 를 만들지 않는다', () => {
    expect(
      buildNaverMapStyleProps(navermaps, { mode: 'gl', gl: true, customStyleId: 'abc' }),
    ).toEqual({
      gl: true,
      customStyleId: 'abc',
    });
    expect(getNormalMap).not.toHaveBeenCalled();
  });

  it('raster 모드는 overlayType 을 넣은 normal 지도 유형 레지스트리를 만든다', () => {
    const props = buildNaverMapStyleProps(navermaps, { mode: 'raster', overlayType: 'bg.ol.sw' });
    expect(getNormalMap).toHaveBeenCalledWith({ overlayType: 'bg.ol.sw' });
    expect(props).toEqual({
      mapTypes: new MapTypeRegistry({ normal: { kind: 'normal', overlayType: 'bg.ol.sw' } }),
    });
  });
});
