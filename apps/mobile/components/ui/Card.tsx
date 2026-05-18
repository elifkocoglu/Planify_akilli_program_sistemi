import { View, ViewProps } from 'react-native'

interface CardProps extends ViewProps {
  children: React.ReactNode
  padding?: 'sm' | 'md' | 'lg'
  className?: string
}

const PADDING_CLASSES = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ children, padding = 'md', className = '', ...props }: CardProps) {
  return (
    <View
      className={`bg-slate-800 rounded-2xl border border-slate-700 ${PADDING_CLASSES[padding]} ${className}`}
      {...props}
    >
      {children}
    </View>
  )
}
