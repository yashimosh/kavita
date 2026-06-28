export interface Shelf {
  id: number;
  title: string;
  summary: string | null;
  coverImage: string | null;
  itemCount: number;
  owner: string | null;
  created: string;
  lastModified: string;
}
