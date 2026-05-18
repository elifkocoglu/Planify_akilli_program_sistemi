import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase/client'

const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL ?? 'http://localhost:3000'

interface InvitationInfo {
  institutionName: string
  institutionId: string
  role: string
}

export default function RegisterScreen() {
  const router = useRouter()
  const { code } = useLocalSearchParams<{ code?: string }>()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [inviteCode, setInviteCode] = useState(code ?? '')
  const [hasInviteCode, setHasInviteCode] = useState(!!code)
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null)

  const [loading, setLoading] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [error, setError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [success, setSuccess] = useState(false)

  // URL'den gelen kodu otomatik doğrula
  useEffect(() => {
    if (code) {
      verifyInviteCode(code)
    }
  }, [code])

  async function verifyInviteCode(codeToVerify: string) {
    if (!codeToVerify.trim()) {
      setCodeError('Davet kodu boş olamaz.')
      return
    }

    setVerifyingCode(true)
    setCodeError('')
    setInvitationInfo(null)

    try {
      const response = await fetch(
        `${WEB_API_URL}/api/invitations/verify?code=${encodeURIComponent(codeToVerify.trim())}`
      )
      const data = await response.json()

      if (!response.ok || !data.valid) {
        setCodeError(data.message ?? 'Geçersiz veya süresi dolmuş davet kodu.')
      } else {
        setInvitationInfo({
          institutionName: data.institutionName ?? 'Bilinmiyor',
          institutionId: data.institutionId ?? '',
          role: data.role ?? 'staff',
        })
      }
    } catch {
      setCodeError('Davet kodu doğrulanamadı. İnternet bağlantınızı kontrol edin.')
    } finally {
      setVerifyingCode(false)
    }
  }

  async function handleRegister() {
    setError('')

    if (!fullName.trim()) {
      setError('Ad soyad zorunludur.')
      return
    }

    // Davet kodusuz modda e-posta gerekli
    if (!hasInviteCode && !email.trim()) {
      setError('E-posta adresi zorunludur.')
      return
    }

    if (!password) {
      setError('Şifre zorunludur.')
      return
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }

    if (!hasInviteCode && password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    if (hasInviteCode && !invitationInfo) {
      setError('Lütfen önce davet kodunuzu doğrulayın.')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim() || `${inviteCode.trim()}@invite.planify`,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'staff',
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Bu e-posta adresi zaten kayıtlı.')
        } else {
          setError('Kayıt olunamadı: ' + signUpError.message)
        }
        return
      }

      // Davet kodunu kabul et
      if (hasInviteCode && invitationInfo && authData.user) {
        try {
          await fetch(`${WEB_API_URL}/api/invitations/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: inviteCode.trim(),
              userId: authData.user.id,
            }),
          })
        } catch {
          // Davet kodu hatası kritik değil, kayıt tamamlandı
          console.warn('Davet kodu kabul edilemedi')
        }
      }

      setSuccess(true)
    } catch {
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center px-6">
        <View className="bg-slate-800 rounded-3xl p-8 w-full items-center">
          <Text className="text-5xl mb-4">📧</Text>
          <Text className="text-white text-xl font-bold text-center mb-3">
            E-postanızı Doğrulayın
          </Text>
          <Text className="text-slate-400 text-center text-base leading-6 mb-6">
            Kayıt işleminiz tamamlandı. Giriş yapmak için lütfen e-posta adresinize
            gönderilen doğrulama bağlantısına tıklayın.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            className="bg-blue-600 rounded-xl py-3.5 w-full items-center"
          >
            <Text className="text-white font-bold text-base">Giriş Sayfasına Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
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
        <View className="flex-1 justify-center px-6 py-12">
          {/* Başlık */}
          <View className="items-center mb-8">
            <View className="bg-blue-600 w-16 h-16 rounded-2xl items-center justify-center mb-3">
              <Text className="text-white text-3xl font-bold">P</Text>
            </View>
            <Text className="text-white text-2xl font-bold">Hesap Oluştur</Text>
            <Text className="text-slate-400 text-sm mt-1">Planify Personel Kaydı</Text>
          </View>

          {/* Davet kodu banner */}
          {invitationInfo && (
            <View className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
              <Text className="text-green-400 text-sm font-semibold text-center">
                ✓ {invitationInfo.institutionName} kurumuna davet edildiniz
              </Text>
            </View>
          )}

          {/* Form */}
          <View className="bg-slate-800 rounded-3xl p-6">
            {error ? (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <Text className="text-red-400 text-sm text-center">{error}</Text>
              </View>
            ) : null}

            {/* Ad Soyad */}
            <View className="mb-4">
              <Text className="text-slate-300 text-sm font-medium mb-2">Ad Soyad</Text>
              <TextInput
                className="bg-slate-700 text-white rounded-xl px-4 py-3.5 text-base border border-slate-600"
                placeholder="Adınız Soyadınız"
                placeholderTextColor="#64748B"
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />
            </View>

            {/* E-posta (davet koduyla gizli) */}
            {!hasInviteCode && (
              <View className="mb-4">
                <Text className="text-slate-300 text-sm font-medium mb-2">E-posta</Text>
                <TextInput
                  className="bg-slate-700 text-white rounded-xl px-4 py-3.5 text-base border border-slate-600"
                  placeholder="ornek@kurum.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            )}

            {/* Şifre */}
            <View className="mb-4">
              <Text className="text-slate-300 text-sm font-medium mb-2">Şifre</Text>
              <TextInput
                className="bg-slate-700 text-white rounded-xl px-4 py-3.5 text-base border border-slate-600"
                placeholder="En az 6 karakter"
                placeholderTextColor="#64748B"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            {/* Şifre tekrar (davet koduyla gizli) */}
            {!hasInviteCode && (
              <View className="mb-4">
                <Text className="text-slate-300 text-sm font-medium mb-2">
                  Şifre Tekrar
                </Text>
                <TextInput
                  className="bg-slate-700 text-white rounded-xl px-4 py-3.5 text-base border border-slate-600"
                  placeholder="Şifrenizi tekrar girin"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  editable={!loading}
                />
              </View>
            )}

            {/* Davet kodu switch */}
            <View className="flex-row items-center justify-between mb-4 py-2">
              <Text className="text-slate-300 text-sm font-medium">
                Davet kodum var
              </Text>
              <Switch
                value={hasInviteCode}
                onValueChange={(val) => {
                  setHasInviteCode(val)
                  if (!val) {
                    setInvitationInfo(null)
                    setCodeError('')
                  }
                }}
                trackColor={{ false: '#334155', true: '#2563EB' }}
                thumbColor={hasInviteCode ? '#3B82F6' : '#64748B'}
                disabled={loading}
              />
            </View>

            {/* Davet kodu input */}
            {hasInviteCode && (
              <View className="mb-4">
                <Text className="text-slate-300 text-sm font-medium mb-2">
                  Davet Kodu
                </Text>
                <View className="flex-row gap-2">
                  <TextInput
                    className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3.5 text-base border border-slate-600"
                    placeholder="XXXX-XXXX"
                    placeholderTextColor="#64748B"
                    autoCapitalize="characters"
                    value={inviteCode}
                    onChangeText={(v) => {
                      setInviteCode(v)
                      setInvitationInfo(null)
                      setCodeError('')
                    }}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => verifyInviteCode(inviteCode)}
                    disabled={verifyingCode || !inviteCode.trim()}
                    className={`rounded-xl px-4 items-center justify-center ${
                      verifyingCode ? 'bg-slate-700' : 'bg-blue-600'
                    }`}
                  >
                    {verifyingCode ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white font-semibold text-sm">Doğrula</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {codeError ? (
                  <Text className="text-red-400 text-xs mt-1">{codeError}</Text>
                ) : null}
                {invitationInfo ? (
                  <Text className="text-green-400 text-xs mt-1">
                    ✓ Geçerli davet — {invitationInfo.institutionName}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Kayıt butonu */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              className={`rounded-xl py-4 items-center mt-2 ${
                loading ? 'bg-blue-800' : 'bg-blue-600'
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Kayıt Ol</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Giriş linki */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 items-center"
            disabled={loading}
          >
            <Text className="text-slate-400 text-sm">
              Zaten hesabınız var mı?{' '}
              <Text className="text-blue-400 font-semibold">Giriş Yap</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
