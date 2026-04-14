import { View, type ViewProps } from 'react-native';
import { useTheme } from '../../lib/theme/ThemeProvider';

type Props = ViewProps & {
  padding?: number;
  radius?: number;
};

export default function Card({ style, padding = 20, radius = 20, ...rest }: Props) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: t.card,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: radius,
          padding,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: t.name === 'dark' ? 0.35 : 0.05,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    />
  );
}
