// frontend/src/app/page.tsx
import { redirect } from "next/navigation"

export default function HomePage() {
  // Automatically redirect to the main dashboard
  redirect("/dashboard")
}
