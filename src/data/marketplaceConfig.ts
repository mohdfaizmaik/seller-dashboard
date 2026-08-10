/**
 * Centralized marketplace fee, shipping, and advertising configurations.
 * 
 * IMPORTANT WARNING:
 * These are MOCK assumptions for the MVP (Minimum Viable Product) dashboard
 * to facilitate metric demonstration. They do NOT reflect actual Amazon SP-API 
 * or Flipkart Seller API fee schedules. Real schedules are highly variable by
 * product subcategory, weight, dimensions, fulfillment type (FBA/EasyShip/Self),
 * and seller tier.
 */

export interface PlatformConfig {
  referralFeeRate: number;      // Percentage of order value (e.g. 0.15 for 15%)
  fixedClosingFee: number;      // Fixed fee per fulfilled order (in INR)
  flatShippingRate: number;     // Shipping cost per fulfilled order (in INR)
  dailyAdBudget: number;        // Allocated daily marketing budget (in INR)
}

export interface ReturnConfig {
  flatReturnShipping: number;   // Reverse logistics shipping cost (in INR)
  reverseProcessingFee: number; // Restocking/reverse warehouse processing fee (in INR)
  writeOffPercentage: number;   // Percentage of product COGS lost to damage/write-off (0.50 for 50%)
}

export const MARKETPLACE_CONFIG = {
  amazon: {
    referralFeeRate: 0.15,     // 15% referral fee
    fixedClosingFee: 20,       // ₹20 fixed closing fee
    flatShippingRate: 60,      // ₹60 flat shipping
    dailyAdBudget: 500         // ₹500/day ad spend
  } as PlatformConfig,
  
  flipkart: {
    referralFeeRate: 0.12,     // 12% commission
    fixedClosingFee: 15,       // ₹15 fixed fee
    flatShippingRate: 50,      // ₹50 flat shipping
    dailyAdBudget: 300         // ₹300/day ad spend
  } as PlatformConfig,

  returns: {
    flatReturnShipping: 80,    // ₹80 reverse shipping
    reverseProcessingFee: 30,  // ₹30 return processing
    writeOffPercentage: 0.50    // 50% loss on product COGS for damaged units
  } as ReturnConfig
};
export default MARKETPLACE_CONFIG;
