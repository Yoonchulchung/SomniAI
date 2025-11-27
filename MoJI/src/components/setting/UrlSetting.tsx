import { Card, CardHeader, CardSection } from '../Card';
import { theme } from '../../theme';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  Animated,
  TouchableOpacity,
} from 'react-native';
import React, { memo } from 'react';
import { Button } from '../Button';




interface ServerUrlSettingProps {
    readonly serverUrl: string;
    readonly title: string;
    readonly setServerUrl: (url: string) => void;
    readonly onSave: () => void;
}

export const UrlSetting = memo<ServerUrlSettingProps> (
  ({serverUrl, title, setServerUrl, onSave}) => {
  
  return <Card style={{ marginBottom: theme.spacing.md }}>
              <CardHeader title={title} />
              <CardSection>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.colors.border.default,
                      color: theme.colors.text.primary,
                      backgroundColor: theme.colors.background.secondary,
                    },
                  ]}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder=""
                  placeholderTextColor={theme.colors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Button
                  title="저장"
                  onPress={onSave}
                  variant="primary"
                  size="md"
                  fullWidth
                />
              </CardSection>
            </Card>
  },
);


const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    fontWeight: '500',
  },
});