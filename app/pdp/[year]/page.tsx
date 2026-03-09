import { redirect } from "next/navigation"

export default async function PDPYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  redirect(`/pdp?year=${year}`)
}
