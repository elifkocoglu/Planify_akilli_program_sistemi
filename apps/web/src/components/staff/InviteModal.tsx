'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Copy, Mail, Key } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { DepartmentRecord } from '@/lib/api/types'

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departments: DepartmentRecord[]
}

export function InviteModal({ open, onOpenChange, departments }: InviteModalProps) {
  const [tab, setTab] = useState('email')

  // Email form
  const [email, setEmail] = useState('')
  const [emailRole, setEmailRole] = useState('staff')
  const [emailDept, setEmailDept] = useState('')
  const [emailExpiry, setEmailExpiry] = useState('7')
  const [emailSending, setEmailSending] = useState(false)

  // Code form
  const [codeRole, setCodeRole] = useState('staff')
  const [codeDept, setCodeDept] = useState('')
  const [codeMaxUses, setCodeMaxUses] = useState('1')
  const [codeExpiry, setCodeExpiry] = useState('7')
  const [codeGenerating, setCodeGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')

  // Reset on close
  useEffect(() => {
    if (!open) {
      setEmail('')
      setEmailRole('staff')
      setEmailDept('')
      setGeneratedCode('')
    }
  }, [open])

  const handleSendEmail = async () => {
    if (!email.trim()) {
      toast.error('E-posta adresi zorunludur')
      return
    }
    if (!emailDept) {
      toast.error('Departman seçimi zorunludur')
      return
    }

    try {
      setEmailSending(true)
      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role: emailRole,
          department_id: emailDept,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      toast.success(`${email} adresine davet gönderildi`)
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Davet gönderilemedi, tekrar deneyin'
      )
    } finally {
      setEmailSending(false)
    }
  }

  const handleGenerateCode = async () => {
    if (!codeDept) {
      toast.error('Departman seçimi zorunludur')
      return
    }

    try {
      setCodeGenerating(true)
      const res = await fetch('/api/invitations/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: codeRole,
          departmentId: codeDept,
          maxUses: parseInt(codeMaxUses) || 1,
          expiresInDays: parseInt(codeExpiry) || 7,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setGeneratedCode(data.code)
      toast.success('Davet kodu oluşturuldu')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Kod oluşturulamadı'
      )
    } finally {
      setCodeGenerating(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    toast.success('Kod kopyalandı')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Personel Davet Et</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/5 border-white/10 w-full">
            <TabsTrigger
              value="email"
              className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400"
            >
              <Mail className="h-3.5 w-3.5 mr-2" />
              E-posta ile Davet
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400"
            >
              <Key className="h-3.5 w-3.5 mr-2" />
              Davet Kodu
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">E-posta Adresi</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="personel@example.com"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Rol</Label>
              <Select value={emailRole} onValueChange={setEmailRole}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="staff">Personel</SelectItem>
                  <SelectItem value="department_admin">Bölüm Yöneticisi</SelectItem>
                  <SelectItem value="institution_admin">Kurum Yöneticisi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Departman</Label>
              <Select value={emailDept} onValueChange={setEmailDept}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Departman seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Geçerlilik Süresi</Label>
              <Select value={emailExpiry} onValueChange={setEmailExpiry}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="1">1 gün</SelectItem>
                  <SelectItem value="3">3 gün</SelectItem>
                  <SelectItem value="7">7 gün</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={emailSending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {emailSending ? 'Gönderiliyor...' : 'Davet Gönder'}
            </Button>
          </TabsContent>

          {/* Code Tab */}
          <TabsContent value="code" className="space-y-4 mt-4">
            {generatedCode ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-400 mb-2">Davet Kodu</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xl font-mono font-bold text-white tracking-widest">
                      {generatedCode}
                    </code>
                    <Button
                      onClick={copyCode}
                      variant="ghost"
                      size="sm"
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => setGeneratedCode('')}
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  Yeni Kod Oluştur
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Rol</Label>
                  <Select value={codeRole} onValueChange={setCodeRole}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="staff">Personel</SelectItem>
                      <SelectItem value="department_admin">Bölüm Yöneticisi</SelectItem>
                      <SelectItem value="institution_admin">Kurum Yöneticisi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Departman</Label>
                  <Select value={codeDept} onValueChange={setCodeDept}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Departman seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Maksimum Kullanım Sayısı</Label>
                  <Input
                    type="number"
                    value={codeMaxUses}
                    onChange={(e) => setCodeMaxUses(e.target.value)}
                    min={1}
                    max={100}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Geçerlilik Süresi</Label>
                  <Select value={codeExpiry} onValueChange={setCodeExpiry}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="1">1 gün</SelectItem>
                      <SelectItem value="3">3 gün</SelectItem>
                      <SelectItem value="7">7 gün</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerateCode}
                  disabled={codeGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {codeGenerating ? 'Oluşturuluyor...' : 'Kod Oluştur'}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
