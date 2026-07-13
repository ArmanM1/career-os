import { Resend } from "resend";
import { requireServerSecret } from "@/lib/env";

let resend: Resend | undefined;

export function getResendClient() {
  resend ??= new Resend(requireServerSecret("RESEND_API_KEY"));
  return resend;
}
