"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ArrowLeft, Shield } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { membershipService, type MembershipPlan, type MembershipInfo } from "@/lib/api/membership";
import { paymentService, type PaymentHistoryItem } from "@/lib/api/payment";

export default function PaymentPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [current, setCurrent] = useState<MembershipInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [plansRes, currentRes] = await Promise.all([
          membershipService.plans(),
          membershipService.current(),
        ]);
        if (!alive) return;
        setPlans(plansRes);
        setCurrent(currentRes);
      } catch {
        if (!alive) return;
        setError("Unable to load membership information right now.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const items = await paymentService.history(10);
        if (!alive) return;
        setHistory(items);
      } catch {
        if (!alive) return;
        setHistoryError("Unable to load payment history.");
      } finally {
        if (alive) setHistoryLoading(false);
      }
    };
    void run();
    return () => { alive = false; };
  }, []);

  const handleCancel = async () => {
    setCancelLoading(true);
    setCancelError(null);
    setCancelSuccess(false);
    try {
      await membershipService.cancel(true);
      setCancelSuccess(true);
      setCurrent((prev) => prev ? { ...prev, active: false } : prev);
    } catch {
      setCancelError("Unable to cancel subscription. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const activePlan =
    current &&
    plans.find(
      (p) =>
        String(p.level_id ?? p.id).toLowerCase() ===
        String(current.level_id ?? "").toLowerCase()
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto w-full px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push("/pricing")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={20} />
              <span>Back to Pricing</span>
            </button>
            <h1 className="text-2xl font-semibold">Membership & Billing</h1>
          </div>

          {loading && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading membership details...
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Current Membership */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold mb-2">Current membership</h2>
                {!current && !loading && (
                  <p className="text-sm text-muted-foreground">
                    You do not currently have an active membership. Choose a plan on the pricing
                    page to get started.
                  </p>
                )}
                {current && (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 border border-green-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        {current.active ? "Active" : "Inactive"}
                      </span>
                      {activePlan && (
                        <span className="text-muted-foreground">{activePlan.name}</span>
                      )}
                    </div>
                    {current.expires_at && (
                      <p className="text-muted-foreground">
                        Renews / expires on{" "}
                        <span className="font-medium">{current.expires_at}</span>
                      </p>
                    )}
                    {current.active && !cancelSuccess && (
                      <div className="pt-2">
                        <button
                          onClick={handleCancel}
                          disabled={cancelLoading}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {cancelLoading ? "Cancelling..." : "Cancel subscription"}
                        </button>
                        {cancelError && (
                          <p className="mt-2 text-xs text-red-600">{cancelError}</p>
                        )}
                      </div>
                    )}
                    {cancelSuccess && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Subscription cancelled. It will remain active until the end of the billing period.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Available Plans */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Available plans</h2>
                {plans.length === 0 && !loading && (
                  <p className="text-sm text-muted-foreground">
                    No membership plans returned by the API.
                  </p>
                )}
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div
                      key={String(plan.id)}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{plan.name}</p>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {typeof plan.price !== "undefined" && (
                          <div className="font-semibold">
                            {typeof plan.price === "number"
                              ? `£${plan.price.toFixed(2)}`
                              : plan.price}
                          </div>
                        )}
                        {plan.interval && <div className="text-xs">{plan.interval}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Payment history</h2>
                {historyLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner />
                    Loading payment history...
                  </div>
                )}
                {historyError && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {historyError}
                  </p>
                )}
                {!historyLoading && !historyError && history.length === 0 && (
                  <p className="text-sm text-muted-foreground">No payment history found.</p>
                )}
                {!historyLoading && history.length > 0 && (
                  <div className="space-y-3">
                    {history.map((item, idx) => (
                      <div
                        key={item.id ?? idx}
                        className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {item.description ?? "Payment"}
                          </p>
                          {item.created_at && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.created_at}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {typeof item.amount !== "undefined" && (
                            <p className="font-semibold">
                              {item.currency
                                ? `${item.currency.toUpperCase()} ${(item.amount / 100).toFixed(2)}`
                                : item.amount}
                            </p>
                          )}
                          {item.status && (
                            <span
                              className={`text-xs font-medium ${
                                item.status === "succeeded" || item.status === "paid"
                                  ? "text-green-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {item.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Shield size={20} />
                  <span className="font-semibold">Billing handled securely</span>
                </div>
                <p className="text-sm text-green-700">
                  Payments and checkout are managed via the membership portal. Use the pricing page
                  to start or change a subscription.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
