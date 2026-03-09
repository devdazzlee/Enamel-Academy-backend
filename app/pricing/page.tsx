"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { membershipService, type MembershipPlan } from "@/lib/api/membership";

export default function PricingPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscribingId, setSubscribingId] = useState<string | number | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const apiPlans = await membershipService.plans();
        if (!alive) return;
        setPlans(apiPlans);
      } catch {
        if (!alive) return;
        setError("Unable to load membership plans right now.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => { alive = false; };
  }, []);

  const handleSubscribe = async (plan: MembershipPlan) => {
    setSubscribingId(plan.id);
    try {
      // Use checkout_url from plan data directly if available
      if (plan.checkout_url) {
        window.location.href = plan.checkout_url;
        return;
      }
      // Fallback: fetch checkout URL via /membership/checkout/{id}
      const url = await membershipService.checkoutUrl(plan.id);
      if (url) {
        window.location.href = url;
      } else {
        setError("Checkout link not available for this plan.");
      }
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setSubscribingId(null);
    }
  };

  const formatPrice = (plan: MembershipPlan): string => {
    if (plan.formatted_price) return plan.formatted_price;
    if (typeof plan.price === "number") return `£${plan.price.toFixed(2)}`;
    if (typeof plan.price === "string") return plan.price;
    return "—";
  };

  const formatPeriod = (plan: MembershipPlan): string | undefined => {
    if (plan.cycle_period && plan.cycle_period !== "0") return `per ${plan.cycle_period}`;
    if (plan.interval === "year" || plan.interval === "yearly") return "per year";
    return undefined;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">
          <span className="text-primary">Pric</span>
          <span className="text-muted-foreground">ing</span>
        </h1>

        {loading && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading membership plans...
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs sm:text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {plans.map((plan) => {
            const priceStr = formatPrice(plan);
            const period = formatPeriod(plan);
            return (
              <div
                key={String(plan.id)}
                className={`bg-card rounded-2xl border overflow-hidden flex flex-col sm:flex-row relative ${
                  plan.popular ? "border-primary shadow-md" : "border-border"
                }`}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div className="absolute top-3 right-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {plan.badge}
                  </div>
                )}

                {/* Price Card */}
                <div className="w-full sm:w-64 flex-shrink-0 bg-gradient-to-b from-primary/80 to-primary/40 p-4 sm:p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-xs sm:text-sm text-white/80 mb-1">Pricing</p>
                  <p className="text-2xl sm:text-4xl font-bold text-white mb-1">{priceStr}</p>
                  {period && <p className="text-xs text-white/60">{period}</p>}
                </div>

                {/* Plan Details */}
                <div className="flex-1 p-4 sm:p-6">
                  <p className="text-xs text-muted-foreground mb-1">Subscription</p>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{plan.name}</h2>
                  {plan.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                      {plan.description}
                    </p>
                  )}

                  {/* Features from API */}
                  {plan.features.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={subscribingId === plan.id}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {subscribingId === plan.id ? "Redirecting..." : (plan.button_text ?? "Subscribe Now")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
