"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { apiRequestInit } from "@/lib/api-request";

export function useApiFetch() {
  const { getToken } = useAuth();
  return useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getToken();
    return fetch(input, apiRequestInit(input, init, token));
  }, [getToken]);
}
