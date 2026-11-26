"use client";

import { Suspense } from "react";
import { SignInForm } from "@/components/sign-in-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="wrap section"><p>Loading sign in.</p></main>}>
      <SignInForm />
    </Suspense>
  );
}
