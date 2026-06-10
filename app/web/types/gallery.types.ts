export interface GalleryPhoto {
  id: number | string;
  src: string;
  alt?: string;
  caption?: string;
  category?: string;
  width?: number;
  height?: number;
  thumbnail?: string;
}

export interface GalleryCategory {
  id: number | string;
  name: string;
  slug?: string;
}

export interface GalleryFilterState {
  activeCategory: string | null;
  searchQuery: string;
}
