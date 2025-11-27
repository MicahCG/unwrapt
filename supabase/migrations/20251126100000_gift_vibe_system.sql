-- Gift Vibe System Migration
-- Creates enum, products table, and maps all gifts to vibes

-- 1. Create gift_vibe enum
CREATE TYPE gift_vibe AS ENUM ('CALM_COMFORT', 'ARTFUL_UNIQUE', 'REFINED_STYLISH');

-- 2. Create products table to cache Shopify products with gift vibe metadata
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  shopify_product_id TEXT NOT NULL UNIQUE,
  shopify_variant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  handle TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  featured_image_url TEXT,
  product_type TEXT,
  gift_vibe gift_vibe NOT NULL DEFAULT 'CALM_COMFORT',
  inventory INTEGER DEFAULT 0,
  available_for_sale BOOLEAN DEFAULT true,
  rank INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add preferred_gift_vibe to recipients table
ALTER TABLE public.recipients
ADD COLUMN IF NOT EXISTS preferred_gift_vibe gift_vibe;

-- 4. Add gift_vibe to scheduled_gifts for tracking what was selected
ALTER TABLE public.scheduled_gifts
ADD COLUMN IF NOT EXISTS gift_vibe gift_vibe,
ADD COLUMN IF NOT EXISTS gift_variant_id TEXT,
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_gift_vibe ON public.products(gift_vibe);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_recipients_preferred_vibe ON public.recipients(preferred_gift_vibe);

-- 6. Seed products table with all 15 Shopify products mapped to vibes
INSERT INTO public.products (id, shopify_product_id, shopify_variant_id, title, handle, price, featured_image_url, product_type, gift_vibe, inventory, rank) VALUES

-- CALM_COMFORT (Cozy, soothing, relaxing, ambience)
('eclipse-pine-candle', 'gid://shopify/Product/10167948542271', 'gid://shopify/ProductVariant/51598830993727', 'Eclipse Pine Candle', 'eclipse-pine-candle', 45.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/935091ec-ae2b-46c0-b014-d46d567d082f.jpg?v=1764190196', 'Candle', 'CALM_COMFORT', 10897, 1),

('ashen-mountain-candle', 'gid://shopify/Product/10162377359679', 'gid://shopify/ProductVariant/51581303554367', 'Ashen Mountain Candle', 'ashen-mountain-candle', 89.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/04d8fa97-1714-4782-ac36-b0c56ea3a140.jpg?v=1763476427', 'Candles & Incense', 'CALM_COMFORT', 10300, 2),

('serene-mist-aromatherapy', 'gid://shopify/Product/10167956504895', 'gid://shopify/ProductVariant/51598853177663', 'The Serene Mist Aromatherapy Set', 'the-serene-mist-aromatherapy-set', 78.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/7650bb46-f9a8-43e7-ac20-117b89bfa6bc.jpg?v=1764191692', 'Candles & Incense', 'CALM_COMFORT', 12485, 3),

-- ARTFUL_UNIQUE (Handmade, ritual, heritage, craft, story-driven)
('marrakesh-keepsake-box', 'gid://shopify/Product/10167955489087', 'gid://shopify/ProductVariant/51598849966399', 'The Marrakesh Heritage Keepsake Box', 'the-marrakesh-heritage-keepsake-box', 220.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/5f2494e7-e712-4247-b298-cc0133479f03.jpg?v=1764191441', 'Jewelry', 'ARTFUL_UNIQUE', 43378, 1),

('blue-xiangyun-ceremony', 'gid://shopify/Product/10161279926591', 'gid://shopify/ProductVariant/51574287466815', 'Blue Xiangyun Copper Ceremony Set', 'blue-xiangyun-copper-ceremony-set', 229.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/4eda2251-4113-43a6-8290-989760a46830.jpg?v=1763327291', 'Candles & Incense', 'ARTFUL_UNIQUE', 13053, 2),

('blue-ruihe-burner', 'gid://shopify/Product/10161279533375', 'gid://shopify/ProductVariant/51574286418239', 'Blue Ruihe Copper Temple Burner', 'blue-ruihe-copper-temple-burner', 84.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/e2fcd5cf-8643-465e-99fe-56e1be731298.jpg?v=1763327139', 'Accessory', 'ARTFUL_UNIQUE', 14121, 3),

('kogane-iron-teapot', 'gid://shopify/Product/10161277141311', 'gid://shopify/ProductVariant/51574283731263', 'Kogane Quail Iron Teapot', 'kogane-quail-iron-teapot', 229.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/c492aa7a-e1d4-4b0f-bea4-9c0aa5e4ce3e_trans.jpg?v=1763326881', 'Kitchen Accessory', 'ARTFUL_UNIQUE', 8903, 4),

('wabi-stonefire-bowl', 'gid://shopify/Product/10161275994431', 'gid://shopify/ProductVariant/51574280782143', 'Wabi Kiln Stonefire Bowl', 'wabi-kiln-stonefire-bowl', 239.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/3f91c6bf-9029-47cd-a589-e2f862bddaa5.jpg?v=1763326719', 'Art', 'ARTFUL_UNIQUE', 9387, 5),

('taoist-incense-set', 'gid://shopify/Product/10161273995583', 'gid://shopify/ProductVariant/51574276686143', 'The Taoist Copper Incense Set', 'the-taoist-copper-incense-set', 249.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/ee7f1887-d950-4070-8e42-529a27c94782.jpg?v=1763326261', 'Candles & Incense', 'ARTFUL_UNIQUE', 11613, 6),

('lotus-forge-teapot', 'gid://shopify/Product/10161271669055', 'gid://shopify/ProductVariant/51574271967551', 'Lotus Forge Cast Heritage Teapot', 'lotus-forge-cast-heritage-teapot', 329.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/801318898925.jpg?v=1763325747', 'Accessory', 'ARTFUL_UNIQUE', 20000, 7),

-- REFINED_STYLISH (Elegant design, glassware, striking decor, barware)
('sapphire-kiriko-glass', 'gid://shopify/Product/10161275535679', 'gid://shopify/ProductVariant/51574279504191', 'Sapphire Peacock Kiriko Glass', 'sapphire-peacock-kiriko-glass', 189.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/1a0581b6-85ba-44d2-837e-bcf04c953a59.jpg?v=1763326581', 'Kitchen Accessory', 'REFINED_STYLISH', 12023, 1),

('emerald-kiriko-whiskey', 'gid://shopify/Product/10161274913087', 'gid://shopify/ProductVariant/51574278029631', 'Emerald Kiriko Whiskey Glass', 'emerald-kiriko-whiskey-glass', 139.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/b17be2d6-60b4-4c1e-9033-624fe3a92316.jpg?v=1763326341', 'Kitchen Accessory', 'REFINED_STYLISH', 5851, 2),

('azure-jun-porcelain', 'gid://shopify/Product/10161273405759', 'gid://shopify/ProductVariant/51574275146047', 'Azure Bloom Jun Porcelain Pot', 'azure-bloom-jun-porcelain-pot', 329.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/8232aeda-70de-41c6-a696-7e792e9f2423.jpg?v=1763326105', 'Accessory', 'REFINED_STYLISH', 7696, 3),

('opal-contour-vase', 'gid://shopify/Product/10161272914239', 'gid://shopify/ProductVariant/51574274031935', 'Opal Clay Contour Vase', 'opal-clay-contour-vase', 139.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/392e3378-891b-46da-8e58-0dc26b375a3d.jpg?v=1763325955', 'Art', 'REFINED_STYLISH', 49071, 4),

('crystal-whiskey-cup', 'gid://shopify/Product/10161270980927', 'gid://shopify/ProductVariant/51574270198079', 'Hand Carved Crystal Glass Whiskey Small Glass Cup', 'hand-carved-crystal-glass-whiskey-small-glass-cup', 249.00, 'https://cdn.shopify.com/s/files/1/0941/1012/2303/files/847d7f80-50e8-404c-87ca-1dd50fe3f612_trans.jpg?v=1763325465', 'Kitchen Accessory', 'REFINED_STYLISH', 7271, 5)

ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price,
  featured_image_url = EXCLUDED.featured_image_url,
  inventory = EXCLUDED.inventory,
  gift_vibe = EXCLUDED.gift_vibe,
  updated_at = NOW();

-- 7. Add RLS policies for products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read products
CREATE POLICY "Anyone can view products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (active = true);

-- 8. Create helper function to get products by vibe and budget
CREATE OR REPLACE FUNCTION get_products_by_vibe_and_budget(
  p_vibe gift_vibe,
  p_max_price DECIMAL
)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.products
  WHERE gift_vibe = p_vibe
    AND price <= p_max_price
    AND active = true
    AND available_for_sale = true
  ORDER BY rank ASC, price ASC;
$$;

-- 9. Create helper function to get house essentials
CREATE OR REPLACE FUNCTION get_house_essentials(
  p_max_price DECIMAL DEFAULT 100
)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.products
  WHERE gift_vibe = 'CALM_COMFORT'
    AND price <= p_max_price
    AND active = true
    AND available_for_sale = true
  ORDER BY rank ASC, price ASC
  LIMIT 3;
$$;

COMMENT ON TABLE public.products IS 'Cached Shopify products with gift vibe categorization';
COMMENT ON COLUMN public.products.gift_vibe IS 'Gift vibe category: CALM_COMFORT, ARTFUL_UNIQUE, or REFINED_STYLISH';
COMMENT ON COLUMN public.recipients.preferred_gift_vibe IS 'Recipients preferred gift style for automated selection';
