// One formatter keeps rupee prices consistent on cards and details.
export const formatPrice = (price: number): string => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(price);
