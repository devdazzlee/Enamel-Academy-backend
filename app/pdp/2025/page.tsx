"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PDP2025Page() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/pdp")
  }, [router])

  return null
}
