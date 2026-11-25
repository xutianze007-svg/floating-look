import * as city from './data.js';
import * as weekend from './data-weekend.js';
export const LOOKS = {
  city: { id: 'city', ...city, order: ['cap', 'headphones', 'earrings', 'sunglasses', 'necklace', 'fragrance', 'watch', 'ring', 'bag', 'keychain', 'phone-case'],
    editTitle: 'The City Edit', kicker: 'Look 01 · City Designer',
    story: { img: 'assets/story.jpg', index: '01 / 08', title: 'The Everyday Bag', text: 'Lightweight, versatile, and<br>made for your daily rhythm.', cta: 'Watch the Video', video: 'media/story.mp4' } },
  weekend: { id: 'weekend', ...weekend, order: weekend.ORDER,
    editTitle: 'The Weekend Edit', kicker: 'Look 02 · Weekend Dad',
    story: { img: 'assets/story-weekend.jpg', index: '01 / 08', title: 'The Weekend Carry', text: 'Considered essentials<br>for slower days.', cta: 'View the Story', video: 'media/story-weekend.mp4' } },
};
