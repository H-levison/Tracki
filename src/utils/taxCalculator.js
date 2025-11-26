/**
 * Calculate RRA VAT (Value Added Tax) for Rwanda
 * @param {number} subtotal - The subtotal amount before tax
 * @param {number} vatRate - The VAT rate (e.g., 0.18 for 18%)
 * @returns {Object} Object containing vatAmount and total
 */
export const calculateTax = (subtotal, vatRate = 0.18) => {
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    vatAmount: parseFloat(vatAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

/**
 * Format currency for display (Rwandan Franc - RWF)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
  }).format(amount);
};

