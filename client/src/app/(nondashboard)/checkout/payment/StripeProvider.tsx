import React, { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import {
  Appearance,
  loadStripe,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import { useCreateStripePaymentIntentMutation } from "@/state/api";
import { useCurrentCourse } from "@/hooks/useCurrentCourse";
import Loading from "@/components/Loading";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#0570de",
    colorBackground: "#18181b",
    colorText: "#d2d2d2",
    colorDanger: "#df1b41",
    colorTextPlaceholder: "#6e6e6e",
    fontFamily: "Inter, system-ui, sans-serif",
    spacingUnit: "3px",
    borderRadius: "10px",
    fontSizeBase: "14px",
  },
};

const StripeProvider = ({ children }: { children: React.ReactNode }) => {
  const [clientSecret, setClientSecret] = useState<string | "">("");
  const [createStripePaymentIntent] = useCreateStripePaymentIntentMutation();
  const { course } = useCurrentCourse();

  useEffect(() => {
    if (!course || !stripePromise || clientSecret) return;
  
    const fetchPaymentIntent = async () => {
      try {
        const result = await createStripePaymentIntent({
          amount: course?.price ?? 0,
        }).unwrap();
  
        console.log("Client Secret:", result.clientSecret); // ✅ debug
        setClientSecret(result.clientSecret);
      } catch (err) {
        console.error("PaymentIntent Error:", err);
        setClientSecret("");
      }
    };
  
    fetchPaymentIntent();
  }, [createStripePaymentIntent, course, stripePromise]);
  
  const options: StripeElementsOptions = {
    clientSecret,
    appearance,
  };

  if (!stripePromise) {
    return (
      <div className="text-center text-sm text-red-400">
        Stripe is not configured. Set `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`.
      </div>
    );
  }

  if (!clientSecret) return <Loading />;

  return (
    <Elements stripe={stripePromise} options={options} key={clientSecret}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
