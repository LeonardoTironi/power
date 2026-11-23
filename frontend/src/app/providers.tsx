import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/AuthContext";
import { queryClient as queryClientPadrao } from "./queryClient";

interface ProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/** QueryClient + Auth + Toaster. O roteador fica dentro (App.tsx). */
export function Providers({ children, queryClient = queryClientPadrao }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
