import { Ionicons } from '@expo/vector-icons';
import {
  router,
  type Href,
} from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { useAuth } from '../../../auth/auth-context';
import { AppUpdateBanner } from '../../../components/app-update-banner';
import { QuickActionCard } from '../../../components/quick-action-card';
import { ScreenContainer } from '../../../components/screen-container';
import { SectionHeader } from '../../../components/section-header';
import {
  colors,
  fontSize,
  radius,
  spacing,
} from '../../../theme';

function getInitials(fullName?: string) {
  if (!fullName) {
    return 'GW';
  }

  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

export default function AdminManagementScreen() {
  const { session } = useAuth();

  return (
    <ScreenContainer>
      <Animated.View
        entering={FadeInUp.duration(350)}
        style={styles.header}
      >
        <View style={styles.headerText}>
          <Text style={styles.brand}>
            GRANDWALL
          </Text>

          <Text
            style={styles.title}
            numberOfLines={1}
          >
            İdarəetmə
          </Text>

          <Text style={styles.subtitle}>
            Salam, {session?.fullName}
          </Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(session?.fullName)}
          </Text>
        </View>
      </Animated.View>

      <AppUpdateBanner />

      <Animated.View
        entering={FadeInDown
          .duration(350)
          .delay(80)}
        style={styles.accessCard}
      >
        <View style={styles.accessIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={colors.primary}
          />
        </View>

        <View style={styles.accessText}>
          <Text style={styles.accessTitle}>
            Admin paneli
          </Text>

          <Text style={styles.accessDescription}>
            İstifadəçi və müştəri məlumatlarını idarə et
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Admin
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown
          .duration(350)
          .delay(140)}
        style={styles.section}
      >
        <SectionHeader
          title="İstifadəçilər"
          description="Sistem istifadəçilərinə bax, yarat və redaktə et"
        />

        <QuickActionCard
          title="İstifadəçi siyahısı"
          description="Bütün istifadəçilərə bax və hesabları idarə et"
          icon="people-outline"
          onPress={() => {
            router.push('/users' as Href);
          }}
        />

        <QuickActionCard
          title="Yeni istifadəçi"
          description="Sistemə yeni istifadəçi hesabı əlavə et"
          icon="person-add-outline"
          onPress={() => {
            router.push(
              '/create-user' as Href,
            );
          }}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown
          .duration(350)
          .delay(200)}
        style={styles.section}
      >
        <SectionHeader
          title="Müştərilər"
          description="Müştəri məlumatlarına rahat və sürətli keçid"
        />

        <QuickActionCard
          title="Müştəri siyahısı"
          description="Müştəriləri axtar, məlumatlarına bax və redaktə et"
          icon="person-outline"
          onPress={() => {
            router.push('/customers' as Href);
          }}
        />

        <QuickActionCard
          title="Yeni müştəri"
          description="Sistemə yeni müştəri əlavə et"
          icon="add-circle-outline"
          onPress={() => {
            router.push(
              '/create-customer' as Href,
            );
          }}
        />
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  headerText: {
    flex: 1,
    paddingRight: spacing.md,
  },

  brand: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },

  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  avatarText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  accessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  accessIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  accessText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  accessTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  accessDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginTop: 2,
  },

  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
  },

  badgeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  section: {
    marginTop: spacing.xxl,
  },
});
