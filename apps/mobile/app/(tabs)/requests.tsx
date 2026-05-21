import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function RequestsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-white text-2xl font-bold">Talepler</Text>
          <Text className="text-slate-400 text-sm mt-1">
            İzin ve takas talepleriniz
          </Text>
        </View>

        {/* Placeholder */}
        <View className="flex-1 items-center justify-center px-8 py-16 gap-4">
          <View className="bg-slate-800 border border-slate-700 rounded-3xl w-20 h-20 items-center justify-center">
            <Ionicons name="swap-horizontal-outline" size={36} color="#3B82F6" />
          </View>
          <Text className="text-white text-lg font-bold text-center">
            Talepler Yakında
          </Text>
          <Text className="text-slate-400 text-sm text-center leading-6">
            İzin talebi oluşturma ve vardiya takas işlemleri bu ekrandan yapılacak.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
