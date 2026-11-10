import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { UserRole } from '../../auth/auth-types';
import {
  Permission,
  permissionGroups,
  rolePermissionDefaults,
  type PermissionCode,
} from '../../auth/permissions';
import { colors } from '../../theme';

type Props = {
  role: UserRole;
  value: PermissionCode[];
  onChange: (next: PermissionCode[]) => void;
  disabled?: boolean;
};

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((code) => b.includes(code));

/**
 * What this user may do, ticked one by one. The role fills in its usual set; the admin
 * then adds or removes single permissions. An Admin can always do everything; only the
 * return notifications are a choice for them.
 */
export function PermissionChecklist({ role, value, onChange, disabled }: Props) {
  const isAdmin = role === UserRole.Admin;
  const defaults = rolePermissionDefaults(role);
  const custom = !sameSet(value, defaults);

  const toggle = (code: PermissionCode, on: boolean) =>
    onChange(on ? [...value.filter((c) => c !== code), code] : value.filter((c) => c !== code));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>İcazələr</Text>
        {!isAdmin && custom ? (
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onChange(defaults)}
            hitSlop={8}
          >
            <Text style={styles.reset}>Rolun standartına qaytar</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.note}>
        {isAdmin
          ? 'Admin hər şeyi edə bilər. Yalnız vazvrad bildirişlərini seçin.'
          : custom
            ? 'Bu istifadəçi üçün icazələr rolun standartından fərqlidir.'
            : 'Rolun standart icazələri seçilib. İstənilən icazəni açıb-bağlaya bilərsiniz.'}
      </Text>

      {permissionGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.items.map((item) => {
            const locked = isAdmin && item.code !== Permission.ReturnsNotify;
            const on = locked || value.includes(item.code);
            return (
              <Pressable
                key={item.code}
                accessibilityRole="switch"
                accessibilityState={{ checked: on, disabled: disabled || locked }}
                disabled={disabled || locked}
                onPress={() => toggle(item.code, !on)}
                style={[styles.row, on && styles.rowOn]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.hint}>{item.hint}</Text>
                </View>
                <Switch
                  value={on}
                  disabled={disabled || locked}
                  onValueChange={(next) => toggle(item.code, next)}
                  trackColor={{ true: colors.success, false: colors.border }}
                  thumbColor={colors.white}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  reset: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  note: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  group: { gap: 8 },
  groupTitle: { color: colors.textLight, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.success, backgroundColor: colors.successSoft },
  rowText: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
