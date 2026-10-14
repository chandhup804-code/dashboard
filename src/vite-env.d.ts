/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
  readonly VITE_GYM_NAME?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
declare global { interface Window { Razorpay?: any } }
export {};
