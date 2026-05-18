import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-blue-600',
  secondary: 'bg-slate-700 border border-slate-600',
  danger: 'bg-red-600',
  ghost: 'bg-transparent',
}

const TEXT_CLASSES: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-slate-200',
  danger: 'text-white',
  ghost: 'text-blue-400',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'py-2 px-3 rounded-lg',
  md: 'py-3 px-5 rounded-xl',
  lg: 'py-4 px-6 rounded-2xl',
}

const TEXT_SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

interface ButtonProps {
  onPress: () => void
  children: string
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`items-center justify-center ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${
        fullWidth ? 'w-full' : ''
      } ${isDisabled ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? '#3B82F6' : '#fff'}
        />
      ) : (
        <Text className={`font-semibold ${TEXT_CLASSES[variant]} ${TEXT_SIZE_CLASSES[size]}`}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
}
