import onboardingPostImage from '@/assets/images/on-boarding/on-boarding-1-1.svg';
import onboardingSaveSheetImage from '@/assets/images/on-boarding/on-boarding-1-2.svg';
import onboardingSavedToastImage from '@/assets/images/on-boarding/on-boarding-1-3.svg';
import onboardingTasteMapImage from '@/assets/images/on-boarding/on-boarding-2-1.svg';
import onboardingPlaceCardImage from '@/assets/images/on-boarding/on-boarding-2-2.svg';
import onboardingMapPinImage from '@/assets/images/on-boarding/on-boarding-2-3.svg';
import onboardingFirstGroupImage from '@/assets/images/on-boarding/on-boarding-3-1.svg';
import onboardingSecondGroupImage from '@/assets/images/on-boarding/on-boarding-3-2.svg';
import { cn } from '@/shared/lib/utils';
import styles from './OnboardingIllustrations.module.css';

export interface OnboardingIllustrationProps {
  active?: boolean;
}

export function ImportPlacesIllustration({ active = true }: OnboardingIllustrationProps) {
  return (
    <div className="relative h-full overflow-hidden rounded-[28px]">
      <h2 className="absolute top-[10%] left-0 w-full text-center text-h1 text-gray-90">
        마음에 드는 장소를 발견했다면
        <br />
        공유하기로 저장해보세요
      </h2>

      <img
        src={onboardingPostImage}
        alt=""
        draggable={false}
        className={cn(styles.post, active && styles.postAnimated)}
      />
      <img
        src={onboardingSaveSheetImage}
        alt=""
        draggable={false}
        className={cn(styles.saveSheet, active && styles.saveSheetAnimated)}
      />
      <img
        src={onboardingSavedToastImage}
        alt=""
        draggable={false}
        className={cn(styles.savedToast, active && styles.savedToastAnimated)}
      />
    </div>
  );
}

export function OrganizePlacesIllustration({ active = true }: OnboardingIllustrationProps) {
  return (
    <div className="relative h-full overflow-hidden rounded-[28px]">
      <h2 className="absolute top-[10%] left-0 w-full text-center text-h1 text-gray-90">
        게시물을 저장하고
        <br />
        나만의 취향 지도를 만들어요
      </h2>

      <img
        src={onboardingTasteMapImage}
        alt=""
        draggable={false}
        className={cn(styles.tasteMap, active && styles.tasteMapAnimated)}
      />
      <img
        src={onboardingMapPinImage}
        alt=""
        draggable={false}
        className={cn(styles.mapPin, active && styles.mapPinAnimated)}
      />
      <img
        src={onboardingPlaceCardImage}
        alt=""
        draggable={false}
        className={cn(styles.placeCard, active && styles.placeCardAnimated)}
      />
    </div>
  );
}

export function SharePlacesIllustration({ active = true }: OnboardingIllustrationProps) {
  return (
    <div className="relative h-full overflow-hidden rounded-[28px]">
      <h2 className="absolute top-[10%] left-0 w-full text-center text-h1 text-gray-90">
        그룹별로 장소를 모아
        <br />
        언제든 쉽게 찾아볼 수 있어요
      </h2>

      <img
        src={onboardingFirstGroupImage}
        alt=""
        draggable={false}
        className={cn(styles.groupCard, styles.firstGroup, active && styles.firstGroupAnimated)}
      />
      <img
        src={onboardingSecondGroupImage}
        alt=""
        draggable={false}
        className={cn(styles.groupCard, styles.secondGroup, active && styles.secondGroupAnimated)}
      />
    </div>
  );
}
