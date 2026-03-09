"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
import { paymentService } from "@/lib/api/payment";

type SessionData = {
  status?: string;
  customer_email?: string;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
};

function pickSession(raw: unknown): SessionData {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const data = (obj.data && typeof obj.data === "object" ? obj.data : obj) as Record<string, unknown>;
  return {
    status: data.status as string | undefined,
    customer_email: data.customer_email as string | undefined,
    amount_total: data.amount_total as number | undefined,
    currency: data.currency as string | undefined,
    payment_status: data.payment_status as string | undefined,
  };
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found in the URL.");
      setLoading(false);
      return;
    }
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await paymentService.session(sessionId);
        if (!alive) return;
        setSession(pickSession(raw));
      } catch {
        if (!alive) return;
        setError("Unable to verify your payment session. Please contact support.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => { alive = false; };
  }, [sessionId]);

  const isPaid =
    session?.payment_status === "paid" || session?.status === "complete";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-sm text-muted-foreground">Verifying your payment...</p>
            </div>
          )}

          {!loading && error && (
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mx-auto">
                <span className="text-2xl">⚠️</span>
              </div>
              <h1 className="text-xl font-semibold text-foreground">Verification Failed</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={() => router.push("/payment")}
                className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to Billing
              </button>
            </div>
          )}

          {!loading && !error && session && (
            <div className="space-y-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full mx-auto ${
                  isPaid ? "bg-green-100" : "bg-amber-100"
                }`}
              >
                <span className="text-2xl">{isPaid ? "✓" : "⏳"}</span>
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                {isPaid ? "Payment Successful" : "Payment Pending"}
              </h1>
              {session.customer_email && (
                <p className="text-sm text-muted-foreground">
                  Confirmation sent to{" "}
                  <span className="font-medium text-foreground">{session.customer_email}</span>
                </p>
              )}
              {typeof session.amount_total === "number" && (
                <p className="text-sm text-muted-foreground">
                  Amount:{" "}
                  <span className="font-medium text-foreground">
                    {session.currency?.toUpperCase() ?? ""}{" "}
                    {(session.amount_total / 100).toFixed(2)}
                  </span>
                </p>
              )}
              {session.payment_status && (
                <p className="text-xs text-muted-foreground capitalize">
                  Status: {session.payment_status}
                </p>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => router.push("/payment")}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  View Membership & Billing
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
