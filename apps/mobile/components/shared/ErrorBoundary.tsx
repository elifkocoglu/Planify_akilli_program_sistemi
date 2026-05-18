import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <View className="flex-1 bg-slate-900 items-center justify-center px-6">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-white text-xl font-bold text-center mb-3">
            Bir şeyler ters gitti
          </Text>
          <Text className="text-slate-400 text-center text-sm leading-5 mb-6">
            {this.state.error?.message ?? 'Beklenmeyen bir hata oluştu.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            className="bg-blue-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return this.props.children
  }
}
