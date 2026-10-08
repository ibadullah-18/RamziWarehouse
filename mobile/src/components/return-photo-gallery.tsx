import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProductReturnPhoto } from "../features/product-returns/product-return-types";
import { useAuth } from "../auth/auth-context";
import { cachedReturnPhoto } from "./return-photo-cache";
import { colors } from "../theme";
function Slide({
  uri,
  width,
  height,
}: {
  uri: string;
  width: number;
  height: number;
}) {
  const [scale, setScale] = useState(1);
  const [gesture] = useState(() => createPinchGesture(setScale));
  return (
    <View
      style={{ width, height, overflow: "hidden" }}
      {...gesture.panHandlers}
    >
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={{ width, height, transform: [{ scale }] }}
      />
      <Pressable
        onPress={() => {
          gesture.reset();
        }}
        style={s.reset}
      >
        <Text style={s.text}>1×</Text>
      </Pressable>
    </View>
  );
}
export function ReturnPhotoGallery({
  photos,
  returnId,
  index,
  onClose,
}: {
  photos: ProductReturnPhoto[];
  returnId: string;
  index: number;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(index),
    [uris, setUris] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    let active = true;
    if (!session) return;
    const indexes = [current, current + 1, current - 1].filter(
      (i) => i >= 0 && i < photos.length,
    );
    indexes.forEach((i) => {
      void cachedReturnPhoto(
        session.accessToken,
        session.userId,
        returnId,
        photos[i].id,
        false,
      )
        .then((uri) => {
          if (active) setUris((prev) => ({ ...prev, [photos[i].id]: uri }));
        })
        .catch((e) => {
          if (active && i === current) setError(e.message);
        });
    });
    return () => {
      active = false;
    };
  }, [current, photos, returnId, session, retry]);
  function move(i: number) {
    setError("");
    const next = Math.max(0, Math.min(photos.length - 1, i));
    scroll.current?.scrollTo({ x: next * width, animated: true });
    setCurrent(next);
  }
  return (
    <Modal visible onRequestClose={onClose} animationType="fade">
      <SafeAreaView style={s.safe}>
        <View style={s.bar}>
          <Pressable onPress={onClose}>
            <Text style={s.text}>✕ Bağla</Text>
          </Pressable>
          <Text style={s.text}>
            {current + 1} / {photos.length}
          </Text>
        </View>
        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          contentOffset={{ x: index * width, y: 0 }}
          onMomentumScrollEnd={(e) =>
            setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          showsHorizontalScrollIndicator={false}
        >
          {photos.map((p) => (
            <View
              key={p.id}
              style={{ width, height: height - 180, justifyContent: "center" }}
            >
              {uris[p.id] ? (
                <Slide uri={uris[p.id]} width={width} height={height - 180} />
              ) : (
                <ActivityIndicator color={colors.primary} />
              )}
            </View>
          ))}
        </ScrollView>
        {!!error && (
          <Pressable
            onPress={() => {
              setError("");
              setRetry((r) => r + 1);
            }}
          >
            <Text style={s.text}>Şəkil açılmadı. Yenidən sına</Text>
          </Pressable>
        )}
        <View style={s.bar}>
          <Pressable onPress={() => move(current - 1)} disabled={current === 0}>
            <Text style={s.text}>‹ Əvvəlki</Text>
          </Pressable>
          <Pressable
            onPress={() => move(current + 1)}
            disabled={current === photos.length - 1}
          >
            <Text style={s.text}>Növbəti ›</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080A0D" },
  bar: { padding: 20, flexDirection: "row", justifyContent: "space-between" },
  text: { color: colors.text, fontSize: 16 },
  reset: {
    position: "absolute",
    bottom: 12,
    right: 20,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
});

function createPinchGesture(setScale: (value: number) => void) {
  let start = 0,
    base = 1,
    latest = 1;
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length > 1,
    onMoveShouldSetPanResponder: (e) => e.nativeEvent.touches.length > 1,
    onPanResponderGrant: (e) => {
      const [a, b] = e.nativeEvent.touches;
      if (a && b) start = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
    },
    onPanResponderMove: (e) => {
      const [a, b] = e.nativeEvent.touches;
      if (a && b && start > 0) {
        latest = Math.max(
          1,
          Math.min(
            4,
            (base * Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)) / start,
          ),
        );
        setScale(latest);
      }
    },
    onPanResponderRelease: () => {
      base = latest;
    },
    onPanResponderTerminate: () => {
      base = latest;
    },
  });
  return {
    panHandlers: pan.panHandlers,
    reset: () => {
      base = 1;
      latest = 1;
      setScale(1);
    },
  };
}
