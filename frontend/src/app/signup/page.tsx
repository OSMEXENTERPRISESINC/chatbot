"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"

export default function SignupPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!agreeTerms) {
      setError("You must agree to the Terms & Conditions")
      setIsLoading(false)
      return
    }

    try {
      const response = await register({
        firstName,
        lastName,
        email,
        password,
      })

      if (response.success) {
        router.push("/dashboard")
      } else {
        setError(response.message)
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.")
      console.error("Registration error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#5a5a6e] flex items-center justify-center p-4">
      <Toaster />
      <div className="w-full max-w-5xl bg-[#1e1e28] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-xl">
        {/* Left side with image */}
        <div className="w-full md:w-1/2 relative bg-[#5e4dcd] h-[250px] sm:h-[300px] md:h-auto">
          <div className="absolute top-4 sm:top-8 left-4 sm:left-8 text-white text-lg sm:text-xl font-semibold z-10">
            To Fastwork
          </div>
          <div className="h-full w-full">
            <Image src="/login.jpeg" alt="Productivity" fill className="object-cover" priority />
          </div>
          <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 text-white text-center">
            <h2 className="text-xl sm:text-2xl font-bold">Streamlining SME Productivity</h2>
            <p className="text-base sm:text-xl">All In One</p>
          </div>
        </div>

        {/* Right side with signup form */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 md:p-8 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Create an account</h1>
            <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
              Already have an account?{" "}
              <Link href="/login" className="text-purple-400 hover:text-purple-300">
                Log in
              </Link>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-500 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="bg-[#2a2a38] border-[#3a3a48] h-10 sm:h-12 text-white"
                  disabled={isLoading}
                />
                <Input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="bg-[#2a2a38] border-[#3a3a48] h-10 sm:h-12 text-white"
                  disabled={isLoading}
                />
              </div>

              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#2a2a38] border-[#3a3a48] h-10 sm:h-12 text-white"
                disabled={isLoading}
              />

              <Input
                type="password"
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#2a2a38] border-[#3a3a48] h-10 sm:h-12 text-white"
                disabled={isLoading}
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                  className="data-[state=checked]:bg-[#6c5ce7] border-[#3a3a48]"
                  disabled={isLoading}
                />
                <label
                  htmlFor="terms"
                  className="text-xs sm:text-sm font-medium text-gray-400 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the Terms & Conditions
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-10 sm:h-12 bg-[#6c5ce7] hover:bg-[#5e4dcd] text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="mt-6 sm:mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#3a3a48]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#1e1e28] px-2 text-gray-400">Or register with</span>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  className="h-10 sm:h-12 bg-[#2a2a38] border-[#3a3a48] hover:bg-[#3a3a48] text-white text-xs sm:text-sm"
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    width="20px"
                    height="20px"
                    className="mr-1 sm:mr-2 sm:w-6 sm:h-6"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="h-10 sm:h-12 bg-[#2a2a38] border-[#3a3a48] hover:bg-[#3a3a48] text-white text-xs sm:text-sm"
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1 sm:mr-2 sm:w-6 sm:h-6"
                  >
                    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
                    <path d="M10 2c1 .5 2 2 2 5" />
                  </svg>
                  Apple
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

