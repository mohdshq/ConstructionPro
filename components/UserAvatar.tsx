import React, { useEffect, useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, ViewStyle, StyleProp } from 'react-native';
import { resolveMediaUri } from '@/lib/attachments/resolveMediaUri';

interface UserAvatarProps {
  avatarUrl?: string | null;
  userId?: string;
  name?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  placeholderTextStyle?: StyleProp<any>;
}

export function UserAvatar({
  avatarUrl,
  userId,
  name,
  size = 40,
  style,
  placeholderStyle,
  placeholderTextStyle,
}: UserAvatarProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!avatarUrl) {
      setResolvedUri(null);
      return;
    }
    resolveMediaUri(avatarUrl, { bucket: 'avatars', userId }).then((uri) => {
      if (active) setResolvedUri(uri);
    });
    return () => {
      active = false;
    };
  }, [avatarUrl, userId]);

  if (resolvedUri) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  const initial = (name || 'U').charAt(0).toUpperCase();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#CBD5E1',
          alignItems: 'center',
          justifyContent: 'center',
        },
        placeholderStyle,
      ]}
    >
      <Text style={[{ fontSize: size * 0.4, fontWeight: '600', color: '#334155' }, placeholderTextStyle]}>
        {initial}
      </Text>
    </View>
  );
}
