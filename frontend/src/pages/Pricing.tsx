import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/lib/authContext";

type BillingCycle = "monthly" | "yearly";

interface Plan {
  code: string;
  name: string;
  monthly_price_inr: number;
  yearly_price_inr: number;
  description: string;
  is_active: boolean;
  features: Array<{ feature_key: string; feature_label: string }>;
  popular?: boolean;
  current?: boolean;
}

const Pricing = () => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlans, setCurrentPlans] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load plans and current subscription
  useEffect(() => {
    const loadPlans = async () => {
      setIsLoading(true);
      try {
        const plansResponse = await apiClient.listPlans();
        if (plansResponse.data) {
          setPlans(plansResponse.data);
        }

        // Get current subscription
        const subResponse = await apiClient.getMySubscription();
        if (subResponse.data?.plan_code) {
          setCurrentPlans([subResponse.data.plan_code]);
        }
      } catch (err) {
        console.error("Failed to load plans", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlans();
  }, []);

  const ctaText = useMemo(() => (billingCycle === "monthly" ? "Choose Monthly" : "Choose Yearly"), [billingCycle]);

  const handleSubscribe = async (planCode: string) => {
    if (isSubscribing[planCode]) return;

    setError("");
    setSuccess("");
    setIsSubscribing((prev) => ({ ...prev, [planCode]: true }));

    try {
      const response = await apiClient.subscribeToPlan({
        plan_code: planCode,
        billing_cycle: billingCycle,
      });

      if (response.error) {
        setError(response.error);
      } else {
        setSuccess(`Successfully subscribed to plan!`);
        setCurrentPlans([planCode]);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("Failed to subscribe. Please try again.");
    } finally {
      setIsSubscribing((prev) => ({ ...prev, [planCode]: false }));
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Pricing" centerHeader>
        <div className="text-center py-8">Loading plans...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Pricing" centerHeader>
      <section className="mx-auto w-full max-w-5xl">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex rounded-xl border border-border/60 bg-card/55 p-1">
            <Button
              type="button"
              variant={billingCycle === "monthly" ? "default" : "ghost"}
              className="h-9 rounded-lg px-4"
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </Button>
            <Button
              type="button"
              variant={billingCycle === "yearly" ? "default" : "ghost"}
              className="h-9 rounded-lg px-4"
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly
            </Button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-8">No plans available.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {plans.map((plan, index) => {
              const activePrice = billingCycle === "monthly" ? plan.monthly_price_inr : plan.yearly_price_inr;
              const subLabel = billingCycle === "monthly" ? "/month" : "/year";
              const isCurrent = currentPlans.includes(plan.code);

              return (
                <motion.article
                  key={plan.code}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card flex min-h-[440px] flex-col rounded-3xl border p-6 ${plan.popular ? "border-primary/70" : "border-border/50"}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{plan.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                        <Check className="h-3.5 w-3.5" />
                        Current
                      </span>
                    ) : plan.popular ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                        <Crown className="h-3.5 w-3.5" />
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <div className="mb-4 rounded-2xl border border-border/60 bg-card/60 p-4">
                    <p className="text-3xl font-extrabold">
                      ₹{activePrice.toLocaleString("en-IN")}
                      <span className="ml-1 text-sm font-medium text-muted-foreground">{subLabel}</span>
                    </p>
                  </div>

                  <ul className="mb-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature.feature_key} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{feature.feature_label}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    disabled={isCurrent || isSubscribing[plan.code]}
                    variant={isCurrent ? "outline" : "default"}
                    className={`h-11 w-full rounded-xl ${isCurrent ? "border-border/60" : "bg-primary text-primary-foreground"}`}
                    onClick={() => handleSubscribe(plan.code)}
                  >
                    {isCurrent ? "Current Plan" : isSubscribing[plan.code] ? "Subscribing..." : ctaText}
                  </Button>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default Pricing;
