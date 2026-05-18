import { View, Text, TextInput, TextInputProps } from 'react-native'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-slate-300 text-sm font-medium mb-2">{label}</Text>
      ) : null}
      <TextInput
        className={`bg-slate-700 text-white rounded-xl px-4 py-3.5 text-base border ${
          error ? 'border-red-500' : 'border-slate-600'
        }`}
        placeholderTextColor="#64748B"
        {...props}
      />
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  )
}
