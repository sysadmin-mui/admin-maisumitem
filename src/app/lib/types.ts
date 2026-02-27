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
