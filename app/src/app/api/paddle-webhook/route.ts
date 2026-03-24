// src/app/api/paddle-webhook/route.ts
// Processes webhook events from Paddle for subscription lifecycle management

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPaddleWebhook, getPlanFromPriceId } from "@/lib/paddle";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature");
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Paddle webhook: PADDLE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Verify signature
    const isValid = verifyPaddleWebhook(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error("Paddle webhook: Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event_type;
    const data = event.data;

    if (!eventType || !data) {
      return NextResponse.json(
        { error: "Invalid event payload" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle subscription events
    if (eventType.startsWith("subscription.")) {
      await handleSubscriptionEvent(supabase, eventType, data);
    }

    // Handle transaction events
    if (eventType.startsWith("transaction.")) {
      await handleTransactionEvent(supabase, eventType, data);
    }

    // Always return 200 to acknowledge receipt — Paddle retries on non-2xx
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Paddle webhook error:", err);
    // Still return 200 to prevent Paddle from retrying on parse errors
    // Log the error for debugging but don't block the webhook
    return NextResponse.json({ received: true });
  }
}

async function handleSubscriptionEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  const paddleSubscriptionId = data.id;
  const paddleCustomerId = data.customer_id || null;
  const status = data.status; // trialing, active, paused, past_due, canceled
  const currentPeriodStart = data.current_billing_period?.starts_at || null;
  const currentPeriodEnd = data.current_billing_period?.ends_at || null;
  const trialEnd = data.next_billed_at || null; // For trialing subscriptions
  const scheduledChange = data.scheduled_change || null;
  const cancelAt = scheduledChange?.action === "cancel"
    ? scheduledChange.effective_at
    : null;

  // Extract price ID and quantity (seats) from the first item
  const firstItem = data.items?.[0];
  const priceId = firstItem?.price?.id || null;
  const seats = firstItem?.quantity || 1;

  // Look up plan from price ID
  const planInfo = priceId ? getPlanFromPriceId(priceId) : null;
  const plan = planInfo?.plan || "starter";
  const billingInterval = planInfo?.interval || "monthly";

  // Get organization_id from custom_data on the subscription
  // We pass this when creating the checkout
  const organizationId = data.custom_data?.organization_id || null;

  if (!organizationId) {
    console.error(
      `Paddle webhook: No organization_id in custom_data for subscription ${paddleSubscriptionId}`
    );
    return;
  }

  if (eventType === "subscription.created") {
    // Insert new subscription record
    const { error } = await supabase.from("subscriptions").upsert(
      {
        organization_id: organizationId,
        paddle_subscription_id: paddleSubscriptionId,
        paddle_customer_id: paddleCustomerId,
        plan,
        billing_interval: billingInterval,
        status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_end: status === "trialing" ? trialEnd : null,
        cancel_at: cancelAt,
        paddle_price_id: priceId,
        seats,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paddle_subscription_id" }
    );

    if (error) {
      console.error("Paddle webhook: Error upserting subscription:", error.message);
      return;
    }

    // Update organization plan
    await supabase
      .from("organizations")
      .update({ plan })
      .eq("id", organizationId);

    console.log(
      `Paddle webhook: subscription.created — org ${organizationId}, plan ${plan}, status ${status}`
    );
  }

  if (
    eventType === "subscription.updated" ||
    eventType === "subscription.paused" ||
    eventType === "subscription.resumed" ||
    eventType === "subscription.past_due"
  ) {
    // Update existing subscription
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan,
        billing_interval: billingInterval,
        status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_end: status === "trialing" ? trialEnd : null,
        cancel_at: cancelAt,
        paddle_price_id: priceId,
        seats,
        updated_at: new Date().toISOString(),
      })
      .eq("paddle_subscription_id", paddleSubscriptionId);

    if (error) {
      console.error("Paddle webhook: Error updating subscription:", error.message);
      return;
    }

    // Update organization plan
    await supabase
      .from("organizations")
      .update({ plan })
      .eq("id", organizationId);

    console.log(
      `Paddle webhook: ${eventType} — org ${organizationId}, plan ${plan}, status ${status}`
    );
  }

  if (eventType === "subscription.canceled") {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at: cancelAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("paddle_subscription_id", paddleSubscriptionId);

    if (error) {
      console.error("Paddle webhook: Error canceling subscription:", error.message);
      return;
    }

    console.log(
      `Paddle webhook: subscription.canceled — org ${organizationId}`
    );
  }
}

async function handleTransactionEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  if (eventType === "transaction.payment_failed") {
    const subscriptionId = data.subscription_id;
    if (!subscriptionId) return;

    // Mark subscription as past_due
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("paddle_subscription_id", subscriptionId);

    if (error) {
      console.error("Paddle webhook: Error marking past_due:", error.message);
    }

    console.log(
      `Paddle webhook: transaction.payment_failed — subscription ${subscriptionId}`
    );
  }

  // transaction.completed — no action needed, subscription.updated handles billing cycle
}