export type IItemStatsData = {
  id: string;
  category: string;
  object: string;
  info1: string;
  info2: string;
  info3: string;
  info4: string;
  info5: string;
  year: number;
  year2: number;
  images_url: string[];
  created_at: string;
  contributor?: string | null;
  slug: string;
  approved: boolean;
};

export type IStatsItemPaginate = {
  from: number;
  to: number;
  per_page: number;
  total: number;
  current_page: number;
  prev_page: number | null;
  next_page: number | null;
  data: IItemStatsData[];
};

export type AdminItemPatchPayload = Partial<{
  object: string;
  info1: string;
  info2: string;
  info3: string;
  info4: string;
  info5: string;
  contributor: string | null;
  year: number | null;
  year2: number | null;
}>;

export type AdminVariationPatchPayload = Partial<{
  description: string;
}>;

export type IVariationStatsData = {
  id: string;
  description: string;
  created_at: string;

  images_url: string[];

  approved: boolean;

  contributor?: string | null;
  slug?: string | null;

  item?: {
    object?: string;
    info1?: string;
    info2?: string;
    info3?: string;
    info4?: string;
    info5?: string;
    year?: number;
    slug?: string;
    images_url: string[];
  };
};

export type IStatsVariationPaginate = {
  from: number;
  to: number;
  per_page: number;
  total: number;
  current_page: number;
  prev_page: number | null;
  next_page: number | null;
  data: IVariationStatsData[];
};

export type EditForm = {
  object: string;
  info1: string;
  info2: string;
  info3: string;
  info4: string;
  info5: string;
  year: string;
  year2: string;
  contributor: string;
};

export type CropAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropArea = { x: number; y: number; width: number; height: number };

type ITicket = {
  id: string;
  type: string;
  description: string;
  author: string | null;
  status: string;
  answer: string | null;
  created_at: string;
  updated_at: string;
  item_id: string | null;
  images_url: string[];
  credits: number | null;
};

export type ITicketRow = { ticket: ITicket; item: IItemStatsData | null };

export type IStatsTicketsPaginate = {
  from: number;
  to: number;
  per_page: number;
  total: number;
  current_page: number;
  prev_page: number | null;
  next_page: number | null;
  data: ITicketRow[];
};

type ICollectionStatsData = {
  id: string;
  name: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
};

export type IStatsCollectionPaginate = {
  from: number;
  to: number;
  per_page: number;
  total: number;
  current_page: number;
  prev_page: number | null;
  next_page: number | null;
  data: ICollectionStatsData[];
};

export type AdminStats = {
  users: number;
  collections: number;
  items: number;
  posts: number;
  products: number;
};

export type AdminCatalogProduct = {
  id: string;
  item_id: string | null;
  item_id_not_applicable: boolean;
  name: string;
  object: string | null;
  merchant_name: string | null;
  brand_name: string | null;
  team_name: string | null;
  team_type: string | null;
  country: string | null;
  sport: string | null;
  condition: string | null;
  type: string | null;
  size: string | null;
  year: number | null;
  price_amount: string | null;
  original_price_amount: string | null;
  currency: string | null;
  image_url: string | null;
  thumb_url: string | null;
  product_url: string | null;
  created_at: string;
  last_seen_at: string;
};

export type ProductItemDraft = {
  team_type: "Time" | "Seleção";
  info1: string;
  info2: string;
  info3: string;
  info4: string;
  info5: string;
  year: number | null;
  year2: number | null;
  catalog_option_found: boolean;
};

export type CreateItemFromProductPayload = Omit<ProductItemDraft, "catalog_option_found">;

export type CreateItemFromProductResponse = {
  item_id: string;
  product_id: string;
  slug: string;
};

export type AdminCatalogProductsPaginate = {
  from: number;
  to: number;
  per_page: number;
  total: number;
  current_page: number;
  prev_page: number | null;
  next_page: number | null;
  data: AdminCatalogProduct[];
};

export type AdminCatalogProductFilters = {
  objects: string[];
  merchants: string[];
};

export type AdminProduct = {
  id: string;
  name: string;
  brand_name: string | null;
  team_name: string | null;
  team_type: string | null;
  merchant_name: string | null;
  image_url: string | null;
  thumb_url: string | null;
  product_url: string | null;
  last_seen_at: string;
  similar_catalog_options?: {
    id: number;
    title: string;
    category: string;
    similarity: number;
  }[];
};

export type CatalogOptionCategory = "brands" | "teams" | "nations";

export type CreateCatalogOptionPayload = {
  title: string;
  category: CatalogOptionCategory;
  country?: string;
  sport?: string;
};

export type CreateCatalogOptionResponse = {
  created: boolean;
  option: CreateCatalogOptionPayload & { id: number };
};

export type AdminProductsPaginate = {
  from: number;
  to: number;
  per_page: number;
  total: number;
  current_page: number;
  prev_page: number | null;
  next_page: number | null;
  data: AdminProduct[];
};

type IUserStatsData = {
  id: string;
  profile: {
    username: string;
    avatar_url: string | null;
    created_at: string;
  };
};

export type IStatsUserPaginate = {
  from: number;
  to: number;
  per_page: number;
  total: number;
  current_page: number;
  prev_page: number | null;
  next_page: number | null;
  data: IUserStatsData[];
};
