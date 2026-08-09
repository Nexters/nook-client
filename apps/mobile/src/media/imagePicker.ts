import type { ImagePickSource, PickedImage } from '@nook/bridge-contracts';
import * as ImagePicker from 'expo-image-picker';

export interface ImagePickOutcome {
  status: 'success' | 'cancelled' | 'error';
  image?: PickedImage;
}

const CANCELLED: ImagePickOutcome = { status: 'cancelled' };
const FAILED: ImagePickOutcome = { status: 'error' };

// 브릿지가 문자열(base64) 통신이라 원본 화질을 그대로 보내면 수 MB 가 된다.
// 프로필 이미지 용도라 정사각 크롭 + 압축으로 충분하다.
const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.5,
  base64: true,
  exif: false,
} satisfies ImagePicker.ImagePickerOptions;

function toOutcome(result: ImagePicker.ImagePickerResult): ImagePickOutcome {
  if (result.canceled) return CANCELLED;

  const asset = result.assets?.[0];
  if (!asset?.base64) return FAILED;

  return {
    status: 'success',
    image: {
      base64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    },
  };
}

async function pickFromAlbum(): Promise<ImagePickOutcome> {
  // iOS 는 시스템 픽커라 권한 없이도 동작하지만, Android 구버전은 요청이 필요하다.
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted && !permission.canAskAgain) return FAILED;

  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return toOutcome(result);
}

async function pickFromCamera(): Promise<ImagePickOutcome> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return FAILED;

  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  return toOutcome(result);
}

/** 앨범/카메라에서 이미지를 골라 base64 로 돌려준다. 업로드와 저장은 웹이 이어서 한다. */
export async function runImagePick(source: ImagePickSource): Promise<ImagePickOutcome> {
  try {
    return source === 'album' ? await pickFromAlbum() : await pickFromCamera();
  } catch {
    return FAILED;
  }
}
