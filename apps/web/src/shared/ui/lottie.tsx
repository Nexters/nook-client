import LottieAnimation, { type LottieComponentProps } from 'lottie-react';

/**
 * lottie-react 래퍼. 애니메이션 JSON 은 `src/assets/lottie/`에 두고
 * import 해서 `animationData` 로 넘긴다 (예: `import loading from '@/assets/lottie/loading.json'`).
 */
function Lottie({ loop = true, autoplay = true, ...props }: LottieComponentProps) {
  return <LottieAnimation loop={loop} autoplay={autoplay} {...props} />;
}

export { Lottie };
