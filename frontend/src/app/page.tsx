// frontend/src/app/page.tsx
import { redirect } from "next/navigation"

export default function HomePage() {
  // Immediately send everyone to /dashboard
  redirect("/dashboard")
}
