import { View, ActivityIndicator } from 'react-native'

interface LoadingSpinnerProps {
  fullScreen?: boolean
  size?: 'small' | 'large'
  color?: string
}

export function LoadingSpinner({
  fullScreen = false,
  size = 'large',
  color = '#3B82F6',
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size={size} color={color} />
      </View>
    )
  }

  return (
    <View className="items-center justify-center py-8">
      <ActivityIndicator size={size} color={color} />
    </View>
  )
}
