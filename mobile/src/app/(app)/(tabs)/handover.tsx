import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../../auth/auth-context';
import { can, Permission } from '../../../auth/permissions';
import { showMessage } from '../../../components/dialogs';
import { AccountPageShell, Notice } from '../../../features/customer-accounts/account-ui';
import { handoverDraft } from '../../../features/handovers/handover-draft';
import { HandoverList } from '../../../features/handovers/handover-list';
import { NewHandover } from '../../../features/handovers/new-handover';
import { colors } from '../../../theme';

type Tab = 'new' | 'mine' | 'all';

/**
 * "Təhvil" tab. Driver ("handovers.create"): new handover + the ones they sent (share, fix,
 * delete; no notifications). Manager ("handovers.view"): every handover of the day.
 */
export default function HandoverTab() {
  const { session } = useAuth();
  const canCreate = can(session, Permission.HandoversCreate);
  const canView = can(session, Permission.HandoversView);
  const [tab, setTab] = useState<Tab>(canCreate ? 'new' : 'all');

  // A photo taken from the tab tap always shows the new handover form.
  useEffect(
    () =>
      handoverDraft.subscribe(() => {
        if (handoverDraft.get().photos.length > 0) setTab('new');
      }),
    [],
  );

  if (!canCreate && !canView) {
    return (
      <AccountPageShell title="Mal təhvil" hideBack>
        <Notice tone="error">Bu bölməyə icazəniz yoxdur.</Notice>
      </AccountPageShell>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    ...(canCreate ? [{ key: 'new' as const, label: 'Yeni təhvil' }] : []),
    ...(canCreate ? [{ key: 'mine' as const, label: 'Göndərdiklərim' }] : []),
    ...(canView ? [{ key: 'all' as const, label: 'Bütün təhvillər' }] : []),
  ];

  return (
    <AccountPageShell title="Mal təhvil" subtitle="Hər gün yeni vərəq" hideBack>
      {tabs.length > 1 ? (
        <View style={styles.segments}>
          {tabs.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item.key }}
              onPress={() => setTab(item.key)}
              style={[styles.segment, tab === item.key && styles.segmentOn]}
            >
              <Text style={[styles.segmentText, tab === item.key && styles.segmentTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {tab === 'new' ? (
        <NewHandover
          onSent={() => {
            showMessage('Göndərildi', 'Təhvil menecerə göndərildi.');
            setTab('mine');
          }}
        />
      ) : (
        <HandoverList key={tab} mine={tab === 'mine'} />
      )}
    </AccountPageShell>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 14, backgroundColor: colors.surfaceSecondary },
  segment: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentOn: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  segmentTextOn: { color: colors.primary, fontWeight: '800' },
});
