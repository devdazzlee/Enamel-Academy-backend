"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CreatePDPPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/pdp?view=form")
  }, [router])

  return null
}
