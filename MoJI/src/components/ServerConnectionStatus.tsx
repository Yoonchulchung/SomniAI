import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface ConnectionStatusProps {
    isConnected: boolean;
    serverUrl: string;
    title: string;
}

export const ConnectionStatus = memo<ConnectionStatusProps>(
  ({ isConnected, serverUrl, title }) => {

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isConnected
                  ? theme.colors.success[500]
                  : theme.colors.error[500],
              },
            ]}>
            <Text style={styles.statusBadgeText}>
              {isConnected ? '연결됨' : '연결 안됨'}
            </Text>
          </View>
        </View>
        <Text style={styles.serverUrl}>{serverUrl}</Text>
      </View>
    );
  },
  (prev, next) =>
    prev.isConnected === next.isConnected &&
    prev.serverUrl === next.serverUrl
);
ConnectionStatus.displayName = 'ConnectionStatus';

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.primary,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.lg,
    },
    statusBadgeText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    serverUrl: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
    },
})