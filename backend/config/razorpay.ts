export function paymentKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId?.startsWith("rzp_test_") || !secret) throw new Error("Configure Razorpay Test Mode keys on the server");
  return { keyId, secret };
}
// Use the Orders REST API so the secret remains exclusively on the server.
export const razorpay = {
  async createOrder(amount: number, receipt: string): Promise<{ id: string; amount: number; currency: string }> {
    const { keyId, secret } = paymentKeys();
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "INR", receipt }),
    });
    if (!response.ok) throw new Error("Payment provider unavailable. Please try again.");
    const order = await response.json() as { id: string; amount: number; currency: string };
    if (!order.id || order.amount !== amount || order.currency !== "INR") throw new Error("Unexpected payment provider response");
    return order;
  },
};
