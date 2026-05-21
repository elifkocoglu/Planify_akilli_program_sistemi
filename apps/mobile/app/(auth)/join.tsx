import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth/AuthContext'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface VerifyResult {
  valid: boolean
  institutionName?: string
  institutionId?: string
  message?: string
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────

export default function JoinScreen() {
  const router = useRouter()
  const { user, signOut, refreshProfile } = useAuth()

  const WEB_URL =
    process.env.EXPO_PUBLIC_WEB_API_URL ?? 'http://localhost:3000'

  // ── State ─────────────────────────────────────────────────
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [joining, setJoining] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)

  // ── Kod doğrulama ─────────────────────────────────────────
  async function handleVerify() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 3) {
      setError('Lütfen geçerli bir davet kodu girin.')
      return
    }

    setVerifying(true)
    setError(null)
    setVerifyResult(null)
    setJoinError(null)

    try {
      const res = await fetch(
        `${WEB_URL}/api/invitations/verify?code=${encodeURIComponent(trimmed)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? 'Geçersiz veya süresi dolmuş kod.')
        return
      }

      const data = await res.json()

      if (data?.valid && data?.institutionName) {
        setVerifyResult({
          valid: true,
          institutionName: data.institutionName,
          institutionId: data.institutionId,
        })
      } else {
        setError('Geçersiz veya süresi dolmuş kod.')
      }
    } catch (err: any) {
      console.error('Doğrulama hatası:', err)
      setError('Sunucuya ulaşılamadı. Lütfen tekrar deneyin.')
    } finally {
      setVerifying(false)
    }
  }

  // ── Kuruma katıl ──────────────────────────────────────────
  async function handleJoin() {
    if (!verifyResult?.valid || !user?.id) return

    setJoining(true)
    setJoinError(null)

    try {
      const res = await fetch(`${WEB_URL}/api/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          userId: user.id,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setJoinError(
          body?.error ?? 'Katılım sağlanamadı. Lütfen tekrar deneyin.'
        )
        return
      }

      // Profili yenile → institutionId dolunca index.tsx otomatik (tabs)'a yönlendirir
      await refreshProfile()
      router.replace('/(tabs)' as any)
    } catch (err: any) {
      console.error('Katılım hatası:', err)
      setJoinError('Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.')
    } finally {
      setJoining(false)
    }
  }

  // ── Çıkış ─────────────────────────────────────────────────
  async function handleSignOut() {
    await signOut()
    router.replace('/(auth)/login')
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── LOGO / BAŞLIK ── */}
          <View className="items-center mb-8">
            {/* Logo circle */}
            <View className="w-20 h-20 bg-blue-600 rounded-3xl items-center justify-center mb-4 shadow-lg">
              <Ionicons name="medical" size={38} color="#fff" />
            </View>
            <Text className="text-white text-4xl font-black tracking-tight">
              Planify
            </Text>
            <Text className="text-blue-400 text-base font-semibold mt-1">
              Kuruma Katıl
            </Text>
          </View>

          {/* ── ANA KART ── */}
          <View className="bg-slate-800 rounded-3xl border border-slate-700 p-6 gap-5">

            {/* Açıklama */}
            <View className="bg-blue-950/60 border border-blue-800/50 rounded-2xl px-4 py-3">
              <Text className="text-blue-200 text-sm leading-6 text-center">
                Sisteme kayıtlısınız ancak henüz bir kuruma bağlı değilsiniz.
                Yöneticinizden aldığınız davet kodunu girerek kurumunuza katılın.
              </Text>
            </View>

            {/* Kod input */}
            <View>
              <Text className="text-slate-300 text-sm font-semibold mb-2">
                Davet Kodu
              </Text>
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t.toUpperCase())
                  // Reset önceki doğrulama
                  if (verifyResult) setVerifyResult(null)
                  if (error) setError(null)
                }}
                placeholder="Davet kodunuzu girin"
                placeholderTextColor="#475569"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                style={{
                  backgroundColor: '#0F172A',
                  borderWidth: 1.5,
                  borderColor: verifyResult?.valid
                    ? '#22C55E'
                    : error
                    ? '#EF4444'
                    : '#334155',
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  color: '#F8FAFC',
                  fontSize: 22,
                  fontWeight: '800',
                  textAlign: 'center',
                  letterSpacing: 6,
                }}
              />
            </View>

            {/* Hata mesajı */}
            {error && (
              <View className="flex-row items-center gap-2 bg-red-950/60 border border-red-700/50 rounded-xl px-4 py-3">
                <Ionicons name="alert-circle" size={18} color="#F87171" />
                <Text className="text-red-300 text-sm flex-1">{error}</Text>
              </View>
            )}

            {/* Başarı banner */}
            {verifyResult?.valid && (
              <View className="flex-row items-center gap-2 bg-green-950/60 border border-green-700/50 rounded-xl px-4 py-3">
                <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
                <Text className="text-green-300 text-sm flex-1">
                  ✓{' '}
                  <Text className="font-bold">{verifyResult.institutionName}</Text>{' '}
                  kurumuna katılıyorsunuz
                </Text>
              </View>
            )}

            {/* "Kodu Doğrula" butonu */}
            {!verifyResult?.valid && (
              <TouchableOpacity
                onPress={handleVerify}
                disabled={verifying || code.trim().length < 3}
                className="bg-blue-600 rounded-2xl py-4 items-center"
                style={{ opacity: verifying || code.trim().length < 3 ? 0.6 : 1 }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Kodu doğrula"
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Kodu Doğrula
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* "Katıl" butonu — sadece doğrulanmışsa görünür */}
            {verifyResult?.valid && (
              <View className="gap-3">
                <TouchableOpacity
                  onPress={handleJoin}
                  disabled={joining}
                  className="bg-green-600 rounded-2xl py-4 items-center flex-row justify-center gap-2"
                  style={{ opacity: joining ? 0.7 : 1 }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Kuruma katıl"
                >
                  {joining ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="enter" size={18} color="#fff" />
                      <Text className="text-white font-bold text-base">
                        Kuruma Katıl
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Farklı kod dene */}
                <TouchableOpacity
                  onPress={() => {
                    setVerifyResult(null)
                    setCode('')
                    setError(null)
                    setJoinError(null)
                  }}
                  className="items-center py-2"
                  accessibilityRole="button"
                >
                  <Text className="text-slate-500 text-sm">Farklı kod dene</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Katılım hatası */}
            {joinError && (
              <View className="flex-row items-center gap-2 bg-red-950/60 border border-red-700/50 rounded-xl px-4 py-3">
                <Ionicons name="warning" size={16} color="#F87171" />
                <Text className="text-red-300 text-sm flex-1">{joinError}</Text>
              </View>
            )}
          </View>

          {/* ── ÇIKIŞ BUTONU ── */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="items-center mt-8 py-2"
            accessibilityRole="button"
            accessibilityLabel="Çıkış yap"
          >
            <Text className="text-slate-500 text-sm">
              Çıkış Yap
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
