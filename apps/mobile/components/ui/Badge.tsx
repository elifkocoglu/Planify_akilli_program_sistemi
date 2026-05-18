import { View, Text } from 'react-native'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default'

const VARIANT_CLASSES: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: 'bg-green-500/15 border border-green-500/30', text: 'text-green-400' },
  warning: { bg: 'bg-yellow-500/15 border border-yellow-500/30', text: 'text-yellow-400' },
  danger: { bg: 'bg-red-500/15 border border-red-500/30', text: 'text-red-400' },
  info: { bg: 'bg-blue-500/15 border border-blue-500/30', text: 'text-blue-400' },
  default: { bg: 'bg-slate-700 border border-slate-600', text: 'text-slate-300' },
}

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const { bg, text } = VARIANT_CLASSES[variant]
  return (
    <View className={`rounded-full px-2.5 py-0.5 self-start ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </View>
  )
}
