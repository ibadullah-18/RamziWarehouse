import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../theme';

/** Loads one photo (thumbnail or full) and returns a local URI. */
export type PhotoLoader = (index: number, thumbnail: boolean) => Promise<string>;

function LoadedImage({ load, index, thumbnail, style }: { load: PhotoLoader; index: number; thumbnail: boolean; style: object }) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    load(index, thumbnail)
      .then((value) => {
        if (alive) setUri(value);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [load, index, thumbnail, attempt]);

  if (uri) return <Image source={{ uri }} style={style} contentFit={thumbnail ? 'cover' : 'contain'} transition={120} />;
  return (
    <Pressable
      disabled={!failed}
      onPress={() => {
        setFailed(false);
        setAttempt((n) => n + 1);
      }}
      style={[style, styles.placeholder]}
    >
      {failed ? <Ionicons name="refresh" size={22} color={colors.textLight} /> : <ActivityIndicator color={colors.primary} />}
    </Pressable>
  );
}

/**
 * Photos laid out like a WhatsApp album: 1 large; 2 side by side; 3 = one large and two
 * stacked; 4 = 2×2; more = 2×2 with "+N" on the last tile. Tapping opens a full-screen viewer.
 */
export function PhotoAlbum({ count, load, width }: { count: number; load: PhotoLoader; width: number }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const gap = 3;
  const half = (width - gap) / 2;

  const tile = (index: number, w: number, h: number, extra = 0) => (
    <Pressable key={index} accessibilityRole="imagebutton" accessibilityLabel={`Şəkil ${index + 1}`} onPress={() => setViewer(index)}>
      <LoadedImage load={load} index={index} thumbnail style={{ width: w, height: h }} />
      {extra > 0 ? (
        <View style={[StyleSheet.absoluteFill, styles.more]}>
          <Text style={styles.moreText}>+{extra}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  let body;
  if (count <= 1) body = tile(0, width, width * 0.75);
  else if (count === 2)
    body = (
      <View style={[styles.row, { gap }]}>
        {tile(0, half, half * 1.2)}
        {tile(1, half, half * 1.2)}
      </View>
    );
  else if (count === 3)
    body = (
      <View style={[styles.row, { gap }]}>
        {tile(0, half, half * 1.4 + gap)}
        <View style={{ gap }}>
          {tile(1, half, half * 0.7)}
          {tile(2, half, half * 0.7)}
        </View>
      </View>
    );
  else
    body = (
      <View style={{ gap }}>
        <View style={[styles.row, { gap }]}>
          {tile(0, half, half)}
          {tile(1, half, half)}
        </View>
        <View style={[styles.row, { gap }]}>
          {tile(2, half, half)}
          {tile(3, half, half, count - 4)}
        </View>
      </View>
    );

  return (
    <>
      <View style={[styles.album, { width }]}>{body}</View>
      <PhotoViewer key={viewer ?? -1} count={count} load={load} start={viewer} onClose={() => setViewer(null)} />
    </>
  );
}

/** Full-screen photos, swipe left/right. */
export function PhotoViewer({ count, load, start, onClose }: { count: number; load: PhotoLoader; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(start ?? 0);

  return (
    <Modal visible={start !== null} animationType="fade" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={styles.viewer}>
        <View style={styles.viewerTop}>
          <Text style={styles.viewerCount}>
            {index + 1} / {count}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Bağla" onPress={onClose} hitSlop={12} style={styles.viewerClose}>
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
        </View>
        {start !== null ? (
          <FlatList
            data={Array.from({ length: count }, (_, i) => i)}
            keyExtractor={(i) => String(i)}
            horizontal
            pagingEnabled
            initialScrollIndex={start}
            getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
            onScroll={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={64}
            renderItem={({ item }) => (
              <View style={{ width, height: height - 120, justifyContent: 'center' }}>
                <LoadedImage load={load} index={item} thumbnail={false} style={{ width, height: height - 120 }} />
              </View>
            )}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  album: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surfaceSecondary },
  row: { flexDirection: 'row' },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSecondary },
  more: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  moreText: { color: colors.white, fontSize: 30, fontWeight: '800' },
  viewer: { flex: 1, backgroundColor: colors.black },
  viewerTop: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  viewerCount: { color: colors.white, fontSize: 16, fontWeight: '600' },
  viewerClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
