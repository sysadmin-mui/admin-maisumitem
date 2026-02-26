export type ItemCatalogProps = {
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
  images: string[];
  credits_image: string;
  contributor: string;
  approved: boolean;
  created_at: string;
  images_url: string[];
};

export type ItemCatalogDetailProps = {
  item: {
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
    images: string[];
    credits_image: string;
    contributor: string;
    approved: boolean;
    created_at: string;
    images_url: string[];
  };
};

export type ItemCollectionDetailProps = {
  item: {
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
    images: string[];
    credits_image: string;
    contributor: string;
    approved: boolean;
    created_at: string;
    images_url: string[];
  };
  collection: {
    name: string;
    name_id: string;
    imageitems?: string[];
    imageitems_url?: string[];
    followers_number?: number;
    quantity_items?: number;
  };
};
