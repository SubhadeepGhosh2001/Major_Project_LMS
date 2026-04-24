"use client";

import Loading from "@/components/Loading";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function PostAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const didReloadRef = useRef(false);

  const nextParam = searchParams.get("next");

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace("/signin");
      return;
    }

    const run = async () => {
      // Metadata changes in Clerk dashboard may require a refresh/reload to reach the client.
      if (!didReloadRef.current) {
        didReloadRef.current = true;
        await user.reload();
      }

      const userType = (user.publicMetadata?.userType as string) || "student";

      if (process.env.NODE_ENV !== "production") {
        console.log("[post-auth] publicMetadata", {
          userId: user.id,
          userType,
          publicMetadata: user.publicMetadata,
        });
      }

      if (nextParam) {
        router.replace(nextParam);
        return;
      }

      router.replace(userType === "teacher" ? "/teacher/courses" : "/user/courses");
    };

    run();
  }, [isLoaded, user, router, nextParam]);

  return <Loading />;
}

