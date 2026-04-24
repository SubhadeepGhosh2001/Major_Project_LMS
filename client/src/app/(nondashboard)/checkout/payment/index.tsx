import React, { useMemo, useState } from "react";
import Script from "next/script";
import { useCheckoutNavigation } from "@/hooks/useCheckoutNavigation";
import { useCurrentCourse } from "@/hooks/useCurrentCourse";
import { useClerk, useUser } from "@clerk/nextjs";
import CoursePreview from "@/components/CoursePreview";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCreateRazorpayOrderMutation,
  useCreateTransactionMutation,
  useVerifyRazorpayPaymentMutation,
} from "@/state/api";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const PaymentPageContent = () => {
  const [createTransaction] = useCreateTransactionMutation();
  const [createOrder] = useCreateRazorpayOrderMutation();
  const [verifyPayment] = useVerifyRazorpayPaymentMutation();
  const { navigateToStep } = useCheckoutNavigation();
  const { course, courseId } = useCurrentCourse();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isPaying, setIsPaying] = useState(false);

  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const isRazorpayReady = useMemo(() => {
    return Boolean(razorpayKeyId);
  }, [razorpayKeyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!course || !courseId) return;

    if (!isRazorpayReady) {
      toast.error("Razorpay is not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID.");
      return;
    }

    if (!window.Razorpay) {
      toast.error("Razorpay Checkout failed to load. Please refresh and try again.");
      return;
    }

    setIsPaying(true);
    try {
      const order = await createOrder({ courseId }).unwrap();

      const options = {
        key: razorpayKeyId,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "Learning Management",
        description: course.title ?? "Course Purchase",
        prefill: {
          name: user?.fullName ?? "",
          email: user?.primaryEmailAddress?.emailAddress ?? "",
        },
        modal: {
          ondismiss: () => {
            toast.message("Payment cancelled");
          },
        },
        handler: async (response: any) => {
          try {
            const verified = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }).unwrap();

            if (!verified.verified) {
              toast.error("Payment verification failed");
              return;
            }

            const transactionData: Partial<Transaction> = {
              transactionId: response.razorpay_payment_id,
              userId: user?.id,
              courseId: courseId,
              paymentProvider: "razorpay" as Transaction["paymentProvider"],
              amount: course?.price || 0,
            };

            await createTransaction(transactionData).unwrap();
            navigateToStep(3);
          } catch (err) {
            toast.error("Payment verification failed");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast.error(resp?.error?.description || "Payment failed");
      });

      rzp.open();
    } catch (err) {
      toast.error("Failed to start payment");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSignOutAndNavigate = async () => {
    await signOut();
    navigateToStep(1);
  };

  if (!course) return null;

  return (
    <div className="payment">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <div className="payment__container">
        {/* Order Summary */}
        <div className="payment__preview">
          <CoursePreview course={course} />
        </div>

        {/* Pyament Form */}
        <div className="payment__form-container">
          <form
            id="payment-form"
            onSubmit={handleSubmit}
            className="payment__form"
          >
            <div className="payment__content">
              <h1 className="payment__title">Checkout</h1>
              <p className="payment__subtitle">
                Fill out the payment details below to complete your purchase.
              </p>

              <div className="payment__method">
                <h3 className="payment__method-title">Payment Method</h3>

                <div className="payment__card-container">
                  <div className="payment__card-header">
                    <CreditCard size={24} />
                    <span>Razorpay Checkout</span>
                  </div>
                  <div className="payment__card-element">
                    <div className="text-sm text-muted-foreground">
                      You will be redirected to a secure Razorpay payment modal.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="payment__actions">
        <Button
          className="hover:bg-white-50/10"
          onClick={handleSignOutAndNavigate}
          variant="outline"
          type="button"
        >
          Switch Account
        </Button>

        <Button
          form="payment-form"
          type="submit"
          className="payment__submit"
          disabled={!isRazorpayReady || isPaying}
        >
          {isPaying ? "Starting Payment..." : "Pay with Razorpay"}
        </Button>
      </div>
    </div>
  );
};

const PaymentPage = () => <PaymentPageContent />;

export default PaymentPage;
