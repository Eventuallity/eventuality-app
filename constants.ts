import { Category, Flyer } from './types';

export const MOCK_FLYERS: Flyer[] = [
  {
    id: 'purple-party',
    title: 'Tropical Purple Party',
    description: 'Liceria Club Presents a Tropical Purple Party with DJ Francois and DJ Sebastian. Doors 10pm, Entry Free.',
    imageUrl: 'https://i.ibb.co/7j1qj5q/flyer.jpg',
    eventDate: '2025-11-15T22:00:00Z',
    category: Category.PARTY,
    categories: [Category.CLUB, Category.PARTY],
    likes: 999,
    dislikes: 2,
    uploader: { id: 'u5', name: 'Liceria Club' },
    externalLink: 'https://www.reallygreatsite.com'
  },
  {
    id: '1',
    title: 'Annual Engineering BBQ',
    description: 'Join us for free food, games, and networking with faculty and peers. All engineering students welcome!',
    imageUrl: 'https://picsum.photos/seed/event1/500/800',
    eventDate: '2025-11-25T17:00:00Z',
    category: Category.ACADEMIC,
    categories: [Category.CLUB, Category.FOOD],
    likes: 125,
    dislikes: 3,
    uploader: { id: 'u1', name: 'EngSoc' },
    externalLink: 'https://example.com/eng-bbq'
  },
  {
    id: '2',
    title: 'Midnight Madness: Glow Party',
    description: 'The biggest party of the semester is here! Glow sticks, live DJ, and non-stop dancing. Don\'t miss out!',
    imageUrl: 'https://picsum.photos/seed/event2/500/800',
    eventDate: '2025-11-22T22:00:00Z',
    category: Category.PARTY,
    categories: [Category.PARTY, Category.SOCIAL],
    likes: 482,
    dislikes: 15,
    uploader: { id: 'u2', name: 'Party Planners Club' },
  },
  {
    id: '3',
    title: 'Debate Club Tryouts',
    description: 'Think you have what it takes? Come to our tryouts and show us your skills. All majors welcome.',
    imageUrl: 'https://picsum.photos/seed/event3/500/800',
    eventDate: '2025-11-28T19:00:00Z',
    category: Category.CLUB,
    categories: [Category.CLUB, Category.ACADEMIC],
    likes: 78,
    dislikes: 1,
    uploader: { id: 'u3', name: 'Debate Society' },
  },
    {
    id: '4',
    title: 'Intramural Soccer Finals',
    description: 'The championship game is finally here! Come cheer for your favorite team and enjoy the thrilling conclusion to the season.',
    imageUrl: 'https://picsum.photos/seed/event4/500/800',
    eventDate: '2025-11-29T14:00:00Z',
    category: Category.SPORTS,
    categories: [Category.SOCIAL, Category.SPORTS],
    likes: 210,
    dislikes: 5,
    uploader: { id: 'u4', name: 'Campus Rec' },
    externalLink: 'https://example.com/soccer-finals'
  },
];

export const CATEGORIES: Category[] = [
    Category.ACADEMIC,
    Category.PARTY,
    Category.CLUB,
    Category.SPORTS,
    Category.PERFORMANCES,
    Category.FOOD,
  Category.SOCIAL,
    Category.OTHER,
];