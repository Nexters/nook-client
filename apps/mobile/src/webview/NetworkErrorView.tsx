import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

/** 웹 gray-10. 스플래시·웹 첫 화면과 같은 배경이라 전환 시 색이 튀지 않는다. */
const BACKGROUND_COLOR = '#f4f5f7';
const BUTTON_COLOR = '#e4e6e9';
const TEXT_COLOR = '#848b96';

/**
 * 원격 웹을 불러오지 못했을 때 흰 화면 대신 보여주는 안내. 시안의 일러스트에 문구가 포함돼 있어
 * 이미지 하나로 그리고, 스크린리더용 문구만 따로 붙인다.
 */
export function NetworkErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/network-error.png')}
        style={styles.illustration}
        resizeMode="contain"
        accessibilityLabel="네트워크가 불안정해요. 연결 상태를 확인해 주세요."
      />
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonLabel}>↻ 다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  illustration: { width: 222, height: 154 },
  button: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: BUTTON_COLOR,
  },
  buttonPressed: { opacity: 0.7 },
  buttonLabel: { fontSize: 14, fontWeight: '600', color: TEXT_COLOR },
});
