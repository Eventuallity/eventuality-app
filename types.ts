
export enum Category {
  ACADEMIC = 'Academic',
  PARTY = 'Party',
  CLUB = 'Club',
  SPORTS = 'Sports',
  ARTS = 'Arts',
  AD = 'Ad'
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Flyer {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  eventDate: string;
  category: Category;
  likes: number;
  dislikes: number;
  uploader: User;
  externalLink?: string;
  location?: string;
  organization?: string;
}