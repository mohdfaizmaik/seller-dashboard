export * from './types';
export * from './detectMarketplace';
export * from './parseReport';
export * from './normalizers/amazonMTRNormalizer';
export {
  normalizeFlipkartSales,
  parseFlipkartDate,
  cleanString,
  cleanSku,
  type NormalizeFlipkartSalesResult
} from './normalizers/flipkartNormalizer';
