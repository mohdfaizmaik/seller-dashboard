export interface ProductCatalogItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  costPrice: number; // COGS (Cost of Goods Sold)
  platform: 'amazon' | 'flipkart' | 'both';
}

export const PRODUCTS_CATALOG: ProductCatalogItem[] = [
  {
    id: 'prod-1',
    name: 'boAt Rockerz 450 Bluetooth Headset',
    sku: 'BOAT-RK450-BLK',
    category: 'Electronics',
    sellingPrice: 1499,
    costPrice: 650,
    platform: 'both'
  },
  {
    id: 'prod-2',
    name: 'OnePlus Nord Buds 2r Wireless Earbuds',
    sku: '1PLUS-NBUDS-BLU',
    category: 'Electronics',
    sellingPrice: 2199,
    costPrice: 980,
    platform: 'both'
  },
  {
    id: 'prod-3',
    name: 'Noise ColorFit Pulse 3 Smartwatch',
    sku: 'NOISE-CFP3-SLV',
    category: 'Electronics',
    sellingPrice: 1999,
    costPrice: 850,
    platform: 'both'
  },
  {
    id: 'prod-4',
    name: 'SanDisk Ultra 64GB MicroSD Card',
    sku: 'SANDISK-64GB-SD',
    category: 'Electronics',
    sellingPrice: 449,
    costPrice: 180,
    platform: 'both'
  },
  {
    id: 'prod-5',
    name: 'Pigeon Amaze 1.5L Electric Kettle',
    sku: 'PIGEON-AMZ-KET',
    category: 'Home & Kitchen',
    sellingPrice: 699,
    costPrice: 320,
    platform: 'both'
  },
  {
    id: 'prod-6',
    name: 'Prestige Iris 750W Mixer Grinder',
    sku: 'PRESTIGE-IRIS-MIX',
    category: 'Home & Kitchen',
    sellingPrice: 3499,
    costPrice: 1650,
    platform: 'both'
  },
  {
    id: 'prod-7',
    name: 'Milton Thermosteel Duo 1000ml Bottle',
    sku: 'MILTON-TSD-1000',
    category: 'Home & Kitchen',
    sellingPrice: 1080,
    costPrice: 510,
    platform: 'both'
  },
  {
    id: 'prod-8',
    name: 'Wipro 12W Smart LED Bulb B22',
    sku: 'WIPRO-12W-SMART',
    category: 'Home & Kitchen',
    sellingPrice: 599,
    costPrice: 240,
    platform: 'both'
  },
  {
    id: 'prod-9',
    name: 'Safari Pentagon 55cm Cabin Trolley Bag',
    sku: 'SAFARI-PENT-55',
    category: 'Home & Kitchen',
    sellingPrice: 2299,
    costPrice: 950,
    platform: 'both'
  },
  {
    id: 'prod-10',
    name: 'Allen Solly Slim Fit Polo Shirt',
    sku: 'AS-POLO-NAVY',
    category: 'Apparel',
    sellingPrice: 899,
    costPrice: 380,
    platform: 'both'
  },
  {
    id: 'prod-11',
    name: "Levi's Men's 511 Slim Fit Jeans",
    sku: 'LEVI-511-INDIGO',
    category: 'Apparel',
    sellingPrice: 2499,
    costPrice: 1100,
    platform: 'both'
  },
  {
    id: 'prod-12',
    name: "Adidas Men's running shoes",
    sku: 'ADI-RUN-COSMO',
    category: 'Apparel',
    sellingPrice: 3299,
    costPrice: 1450,
    platform: 'both'
  },
  {
    id: 'prod-13',
    name: 'Biba Cotton Anarkali Kurta',
    sku: 'BIBA-ANARKALI-RED',
    category: 'Apparel',
    sellingPrice: 1899,
    costPrice: 790,
    platform: 'both'
  },
  {
    id: 'prod-14',
    name: 'The Alchemist by Paulo Coelho',
    sku: 'BOOK-ALCHEMIST',
    category: 'Books',
    sellingPrice: 299,
    costPrice: 120,
    platform: 'both'
  },
  {
    id: 'prod-15',
    name: 'Atomic Habits by James Clear',
    sku: 'BOOK-HABITS',
    category: 'Books',
    sellingPrice: 550,
    costPrice: 240,
    platform: 'both'
  },
  {
    id: 'prod-16',
    name: 'Rich Dad Poor Dad by Robert Kiyosaki',
    sku: 'BOOK-RICHDAD',
    category: 'Books',
    sellingPrice: 399,
    costPrice: 170,
    platform: 'both'
  },
  {
    id: 'prod-17',
    name: 'Nivea Soft Light Moisturiser 200ml',
    sku: 'NIVEA-SOFT-200',
    category: 'Beauty & Health',
    sellingPrice: 349,
    costPrice: 150,
    platform: 'both'
  },
  {
    id: 'prod-18',
    name: "L'Oreal Professional Absolut Repair Shampoo",
    sku: 'LOREAL-SHMP-300',
    category: 'Beauty & Health',
    sellingPrice: 699,
    costPrice: 340,
    platform: 'both'
  },
  {
    id: 'prod-19',
    name: 'Colgate MaxFresh Toothpaste Pack of 3',
    sku: 'COLGATE-MAXF-3P',
    category: 'Beauty & Health',
    sellingPrice: 299,
    costPrice: 130,
    platform: 'both'
  },
  {
    id: 'prod-20',
    name: 'Dettol Liquid Handwash Refill 1.5L',
    sku: 'DETT-HW-REFILL',
    category: 'Beauty & Health',
    sellingPrice: 329,
    costPrice: 140,
    platform: 'both'
  }
];
