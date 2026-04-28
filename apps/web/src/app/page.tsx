import { redirect } from 'next/navigation'

export default function Home() {
  // Ana sayfaya gelen kullanıcıyı doğrudan login sayfasına yönlendir
  // Login sayfası zaten middleware sayesinde oturum açıksa dashboard'a yönlendirecektir
  redirect('/login')
}
