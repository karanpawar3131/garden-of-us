const RAZORPAY_KEY_ID = 'rzp_test_SrXPBf7Ca1CIQt';
const AMOUNT_PAISE = 19900;

const loadRazorpaySDK = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve();
  s.onerror = () => reject(new Error('razorpay SDK failed to load'));
  document.head.appendChild(s);
});

export const CHECKOUT_AMOUNT_PAISE = AMOUNT_PAISE;

export class PaymentCancelled extends Error {
  constructor() { super('payment cancelled'); this.name = 'PaymentCancelled'; }
}

export const openRazorpayCheckout = async ({ storyId, sender, nickname, email, phone }) => {
  await loadRazorpaySDK();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY_ID,
      amount: AMOUNT_PAISE,
      currency: 'INR',
      name: 'Garden of Us',
      description: `a flower garden for ${nickname}`,
      prefill: { name: sender, email, contact: phone },
      notes: { story_id: storyId },
      theme: { color: '#FF6BB5' },
      handler: (response) => {
        resolve({
          razorpay_payment_id: response.razorpay_payment_id,
          amount_paid: AMOUNT_PAISE,
        });
      },
      modal: {
        ondismiss: () => reject(new PaymentCancelled()),
      },
    });
    rzp.on('payment.failed', (resp) => {
      reject(new Error(resp?.error?.description || 'payment failed'));
    });
    rzp.open();
  });
};
