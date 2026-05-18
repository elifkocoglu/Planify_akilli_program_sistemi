import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase/client'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Lütfen tüm alanları doldurun.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (
          signInError.message.includes('Invalid login credentials') ||
          signInError.message.includes('invalid_credentials')
        ) {
          setError('E-posta veya şifre hatalı.')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Lütfen önce e-postanızı doğrulayın.')
        } else {
          setError('Giriş yapılamadı. Lütfen tekrar deneyin.')
        }
      } else {
        // Başarılı giriş sonrası açıkça sekmelere yönlendir
        router.replace('/(tabs)')
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Arka plan dekorasyonu */}
        <View className="absolute top-0 left-0 right-0 h-80 bg-blue-600 opacity-10 rounded-b-[80px]" />

        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo ve başlık */}
          <View className="items-center mb-10">
            <View className="bg-blue-600 w-20 h-20 rounded-3xl items-center justify-center mb-4 shadow-lg">
              <Text className="text-white text-4xl font-bold">P</Text>
            </View>
            <Text className="text-white text-3xl font-bold tracking-tight">Planify</Text>
            <Text className="text-slate-400 text-base mt-2">Personel Giriş Paneli</Text>
          </View>

          {/* Form kartı */}
          <View className="bg-slate-800 rounded-3xl p-6 shadow-xl">
            <Text className="text-white text-xl font-bold mb-6">Giriş Yap</Text>

            {/* Hata mesajı */}
            {error ? (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <Text className="text-red-400 text-sm text-center">{error}</Text>
              </View>
            ) : null}

            {/* E-posta */}
            <View className="mb-4">
              <Text className="text-slate-300 text-sm font-medium mb-2">E-posta</Text>
              <TextInput
                className="bg-slate-700 text-white rounded-xl px-4 py-3.5 text-base border border-slate-600"
                placeholder="ornek@kurum.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            {/* Şifre */}
            <View className="mb-6">
              <Text className="text-slate-300 text-sm font-medium mb-2">Şifre</Text>
              <TextInput
                className="bg-slate-700 text-white rounded-xl px-4 py-3.5 text-base border border-slate-600"
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                secureTextEntry
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            {/* Giriş butonu */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className={`rounded-xl py-4 items-center ${
                loading ? 'bg-blue-800' : 'bg-blue-600'
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Giriş Yap</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Kayıt linki */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            className="mt-6 items-center"
            disabled={loading}
          >
            <Text className="text-slate-400 text-sm">
              Hesabınız yok mu?{' '}
              <Text className="text-blue-400 font-semibold">
                Davet kodunuzla kayıt olun
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
