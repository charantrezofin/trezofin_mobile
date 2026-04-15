import { forwardRef } from 'react';
import { View, Text, TextInput, type TextInputProps, Pressable } from 'react-native';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';

type Props = TextInputProps & {
  label: string;
  leftIcon?: React.ReactNode;
  error?: string | null;
  toggleSecure?: boolean;  // render a show/hide eye for password fields
};

const AuthField = forwardRef<TextInput, Props>(function AuthField(
  { label, leftIcon, error, toggleSecure, secureTextEntry, style, ...rest },
  ref,
) {
  const t = useTheme();
  const [hidden, setHidden] = useState(true);
  const isSecure = !!secureTextEntry && (!toggleSecure ? true : hidden);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        className="text-[11px] font-bold uppercase tracking-widest mb-1.5 ml-1"
        style={{ color: t.textSecondary }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.card,
          borderColor: error ? '#ef4444' : t.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          height: 52,
          gap: 10,
        }}
      >
        {leftIcon}
        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={isSecure}
          placeholderTextColor={t.textSecondary}
          style={[{ flex: 1, color: t.textPrimary, fontSize: 15 }, style]}
        />
        {toggleSecure && secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            {hidden
              ? <Eye size={16} color={t.textSecondary} />
              : <EyeOff size={16} color={t.textSecondary} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4, marginLeft: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export default AuthField;
