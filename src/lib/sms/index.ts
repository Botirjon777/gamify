import "server-only";
import { features } from "@/config/features";

export interface SmsProvider {
  send(phone: string, text: string): Promise<void>;
}

/** Used while FEATURE_SMS_OTP is off: logs in development, does nothing in production. */
class DisabledSmsProvider implements SmsProvider {
  async send(phone: string, text: string) {
    if (process.env.NODE_ENV !== "production") console.info(`[sms:disabled] → ${phone}: ${text}`);
  }
}

let instance: SmsProvider | undefined;

export function getSmsProvider(): SmsProvider {
  if (!instance) {
    // Later: if (features.smsOtp) instance = new EskizSmsProvider(...)
    if (features.smsOtp) throw new Error("No SMS provider implemented yet (FEATURE_SMS_OTP=true)");
    instance = new DisabledSmsProvider();
  }
  return instance;
}
