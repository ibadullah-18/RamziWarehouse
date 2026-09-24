import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AndroidAppVersion,
  getAndroidAppVersion,
  getInstalledVersionCode,
  openAppUpdate,
} from '../api/app-version-api';
import { colors, spacing } from '../theme';

export function AppUpdateGate() {
  const [versionInfo, setVersionInfo] =
    useState<AndroidAppVersion | null>(null);

  const [visible, setVisible] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkVersion() {
      try {
        const installedVersionCode =
          getInstalledVersionCode();

        const info = await getAndroidAppVersion();

        if (!active) {
          return;
        }

        if (
          installedVersionCode > 0 &&
          installedVersionCode < info.latestVersionCode
        ) {
          setVersionInfo(info);
          setVisible(true);
        }
      } catch (error) {
        console.warn(
          'GrandWall update yoxlaması uğursuz oldu:',
          error,
        );
      }
    }

    void checkVersion();

    return () => {
      active = false;
    };
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!versionInfo || isOpening) {
      return;
    }

    try {
      setIsOpening(true);
      await openAppUpdate(versionInfo.downloadUrl);
    } catch (error) {
      console.warn(
        'GrandWall update linki açıla bilmədi:',
        error,
      );
    } finally {
      setIsOpening(false);
    }
  }, [isOpening, versionInfo]);

  if (!versionInfo) {
    return null;
  }

  // GrandWall yeniləmələri istifadəçini bloklamır.
  // Yeni versiya barədə məlumat verilir,
  // amma tətbiqdən istifadə etməyə davam etmək mümkündür.
  const isForced = false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isForced) {
          setVisible(false);
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              YENİ VERSİYA
            </Text>
          </View>

          <Text style={styles.title}>
            GrandWall yeniləndi
          </Text>

          <Text style={styles.description}>
            GrandWall {versionInfo.latestVersion} versiyası
            hazırdır. Ən son funksiyalardan istifadə etmək
            üçün tətbiqi yeniləyin.
          </Text>

          {versionInfo.releaseNotes.length > 0 ? (
            <View style={styles.notes}>
              {versionInfo.releaseNotes.map(
                (note, index) => (
                  <View
                    key={`${note}-${index}`}
                    style={styles.noteRow}
                  >
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.noteText}>
                      {note}
                    </Text>
                  </View>
                ),
              )}
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.updateButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => void handleUpdate()}
            disabled={isOpening}
          >
            {isOpening ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.updateButtonText}>
                İndi yenilə
              </Text>
            )}
          </Pressable>

          {!isForced ? (
            <Pressable
              style={styles.laterButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.laterButtonText}>
                Sonra
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.requiredText}>
              Davam etmək üçün yeniləmə tələb olunur.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },

  card: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 34,
  },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111111',
    marginBottom: 16,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },

  title: {
    color: '#111111',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.6,
  },

  description: {
    marginTop: 10,
    color: '#666666',
    fontSize: 15,
    lineHeight: 22,
  },

  notes: {
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F3F1ED',
    gap: 8,
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  dot: {
    marginRight: 9,
    color: '#111111',
    fontSize: 17,
    lineHeight: 21,
  },

  noteText: {
    flex: 1,
    color: '#454545',
    fontSize: 14,
    lineHeight: 21,
  },

  updateButton: {
    height: 54,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#111111',
  },

  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.82,
  },

  laterButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  laterButtonText: {
    color: '#777777',
    fontSize: 14,
    fontWeight: '600',
  },

  requiredText: {
    marginTop: 14,
    textAlign: 'center',
    color: '#777777',
    fontSize: 12,
  },
});

