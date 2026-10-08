import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { cachedReturnPhoto } from "./return-photo-cache";
import { useAuth } from "../auth/auth-context";
import { colors } from "../theme";
export function AuthenticatedProductReturnPhoto({
  accessToken,
  productReturnId,
  photoId,
  onPress,
}: {
  accessToken: string;
  productReturnId: string;
  photoId: string;
  contentType: string;
  onPress?: () => void;
}) {
  const { session } = useAuth();
  const [uri, setUri] = useState<string | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void cachedReturnPhoto(
      accessToken,
      session?.userId ?? "anonymous",
      productReturnId,
      photoId,
    )
      .then((path) => {
        if (active) setUri(path);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [accessToken, session?.userId, productReturnId, photoId, retry]);
  return (
    <Pressable
      onPress={error ? () => setRetry((n) => n + 1) : onPress}
      accessibilityLabel={error ? "Şəkli yenidən aç" : "Şəkli böyük aç"}
    >
      <View
        style={{
          width: 220,
          height: 160,
          backgroundColor: colors.surface,
          borderRadius: 12,
          overflow: "hidden",
          justifyContent: "center",
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: 220, height: 160 }}
            resizeMode="cover"
          />
        ) : error ? (
          <Text style={{ color: colors.text, padding: 16 }}>
            Şəkil açılmadı. Yenidən sına
          </Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    </Pressable>
  );
}
