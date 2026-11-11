import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useBranding } from '../features/branding/branding-provider';
import { colors } from '../theme';
import { BrandLogo } from './brand-logo';

const HOLD_MS = 1700;
const FADE_MS = 380;

/**
 * Start animation: the current logo (or name) pops in, a line draws under it, then the whole
 * layer fades away. Runs once per app start, on phone and on the web app. Uses the logo the
 * admin set, so the native splash screen itself is left blank.
 */
export function BrandIntro() {
  const { ready, appName } = useBranding();
  const [done, setDone] = useState(false);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const line = useSharedValue(0);
  const caption = useSharedValue(0);
  const layer = useSharedValue(1);

  useEffect(() => {
    if (!ready) return;
    logoOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSequence(
      withSpring(1.06, { damping: 9, stiffness: 140 }),
      withTiming(1, { duration: 220 }),
    );
    line.value = withDelay(320, withTiming(1, { duration: 520, easing: Easing.inOut(Easing.cubic) }));
    caption.value = withDelay(520, withTiming(1, { duration: 400 }));
    layer.value = withDelay(HOLD_MS, withTiming(0, { duration: FADE_MS }));
    const timer = setTimeout(() => setDone(true), HOLD_MS + FADE_MS + 40);
    return () => clearTimeout(timer);
  }, [ready, logoOpacity, logoScale, line, caption, layer]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: layer.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: line.value }], opacity: line.value }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: caption.value,
    transform: [{ translateY: (1 - caption.value) * 8 }],
  }));

  if (done) return null;

  return (
    <Animated.View
      accessibilityLabel={appName}
      style={[styles.layer, layerStyle]}
    >
      {ready ? (
        <>
          <Animated.View style={logoStyle}>
            <BrandLogo width={320} />
          </Animated.View>
          <Animated.View style={[styles.line, lineStyle]} />
          <Animated.View style={captionStyle}>
            <Text style={styles.caption}>Anbar idarəetmə sistemi</Text>
          </Animated.View>
        </>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    pointerEvents: 'none',
  },
  line: {
    width: 180,
    height: 4,
    borderRadius: 2,
    marginTop: 18,
    backgroundColor: colors.primary,
  },
  caption: {
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
