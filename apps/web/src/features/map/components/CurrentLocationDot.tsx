import { CustomOverlay } from 'react-naver-maps';

export function CurrentLocationDot({ lat, lng }: { lat: number; lng: number }) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      <span className="block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-0 bg-blue shadow-sm" />
    </CustomOverlay>
  );
}
