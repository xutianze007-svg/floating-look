// All positions are in the 1536 × 1024 design space of the reference image.
// The white shell sits at (15,15)–(1521,1009); the scene is centred on (768,512).

export const PERSON = {
  id: 'person', label: 'City Designer',
  src: 'media/person-idle.mp4', poster: 'media/person-idle.webp',
  focusSrc: 'media/person-focus.mp4', focusPoster: 'media/person-focus.webp',
  x: 783.3, y: 559.4, w: 680.9, h: 939.8, z: 40, depth: 0.92,
  drift: { ax: 2.2, ay: 5.5, ar: 0.35, as: 0.004, tx: 13, ty: 9.5, tr: 15, ts: 11 },
  worn: null,
};

// label: dot position (dx,dy), text side; anchor: point on the object (uv of the video frame)
export const ITEMS = [
  { id: 'cap', label: 'Cap', cat: 'head', title: 'The Everyday Cap', price: 48, colorName: 'Washed charcoal', color: '#4d4a46',
    desc: 'A familiar silhouette with a little character — the finishing touch to an everyday uniform.',
    x: 583.8, y: 162.5, w: 201.8, h: 136.0, z: 52, depth: 1.02, anchor: [0.125, 0.7624],
    dot: [491, 163.5], side: 'left', path: 'hv', worn: [737, 178, 0.55, -14] },
  { id: 'headphones', label: 'Headphones', cat: 'head', title: 'A Moment of Quiet', price: 189, colorName: 'Sand & silver', color: '#c9b49a',
    desc: 'A softer kind of escape. Sculptural metal, warm neutrals and a little room for yourself.',
    x: 974.1, y: 163.5, w: 168.6, h: 163.0, z: 53, depth: 1.0, anchor: [0.8435, 0.8515],
    dot: [1059, 235.5], side: 'right', path: 'hv', worn: [768, 292, 0.6, 18] },
  { id: 'earrings', label: 'Earrings', cat: 'face', title: 'The Silver Hoops', price: 68, colorName: 'Polished silver', color: '#cfcac1',
    desc: 'Sculptural curves that catch the light. A small detail with a presence of its own.',
    x: 531.4, y: 359.5, w: 88.2, h: 82.7, z: 54, depth: 1.04, anchor: [0.2013, 0.5295],
    dot: [475, 377], side: 'left', path: 'hv', worn: [748, 250, 0.4, 10] },
  { id: 'sunglasses', label: 'Sunglasses', cat: 'face', title: 'A Different Perspective', price: 95, colorName: 'Dark tortoiseshell', color: '#5b3823',
    desc: 'Warm tortoiseshell, smoky lenses and a frame that already feels like an old favourite.',
    x: 1110.1, y: 338.9, w: 153.1, h: 93.0, z: 55, depth: 1.03, anchor: [0.7202, 0.7547],
    dot: [1157, 393], side: 'right', path: 'hv', worn: [776, 230, 0.55, -8] },
  { id: 'fragrance', label: 'Fragrance', cat: 'essentials', title: 'Your Daily Signature', price: 82, colorName: 'Amber glass', color: '#e6c6a7',
    desc: 'An everyday ritual, beautifully contained — a personal note in a considered glass silhouette.',
    x: 526.0, y: 506.8, w: 106.6, h: 133.2, z: 56, depth: 1.05, anchor: [0.2628, 0.9034],
    dot: [501, 585], side: 'right', path: 'hv', worn: [742, 318, 0.4, 12] },
  { id: 'watch', label: 'Watch', cat: 'hands', title: 'Time, Well Spent', price: 165, colorName: 'Brushed silver', color: '#bdbab2',
    desc: 'Clean lines and a quiet face. A timeless companion for all the moments in between.',
    x: 429.6, y: 641.6, w: 104.2, h: 123.3, z: 57, depth: 1.06, anchor: [0.7728, 0.8284],
    dot: [457, 698.5], side: 'right', path: 'hv', worn: [603, 524, 0.45, 20] },
  { id: 'ring', label: 'Rings', cat: 'hands', title: 'The Silver Band', price: 55, colorName: 'Polished silver', color: '#bebbb4',
    desc: 'A single, generous curve — simple enough for every day, distinctive enough to make it yours.',
    x: 364.5, y: 498.2, w: 57.3, h: 52.3, z: 58, depth: 1.08, anchor: [0.9016, 0.3716],
    dot: [451, 486], side: 'left', path: 'bracket', worn: [1094, 428, 0.4, -25] },
  { id: 'bag', label: 'Bag', cat: 'bag', title: 'The Everyday Bag', price: 245, colorName: 'Black leather', color: '#292720',
    desc: 'A sculptural shoulder bag with softly curved lines and warm metal details. Made to move through the day with you.',
    x: 1012.8, y: 590.8, w: 223.2, h: 232.9, z: 59, depth: 1.0, anchor: [0.8688, 0.5757],
    dot: [1140, 590], side: 'right', path: 'hv', worn: [880, 418, 0.6, -10] },
  { id: 'keychain', label: 'Keychain', cat: 'bag', title: 'A Little Personality', price: 38, colorName: 'Black & silver', color: '#272520',
    desc: 'A playful finishing touch — soft texture meets a tiny metallic companion.',
    x: 1147.5, y: 730.5, w: 188.0, h: 169.2, z: 60, depth: 1.04, anchor: [0.1955, 0.8442],
    dot: [1102, 827], side: 'right', path: 'hv', worn: [902, 470, 0.45, 14] },
  { id: 'phone-case', label: 'Phone Case', cat: 'essentials', title: 'The Clear Essential', price: 32, colorName: 'Frosted titanium', color: '#cfcac2',
    desc: 'An understated everyday layer. Clean edges, considered details and nothing unnecessary.',
    x: 1269.7, y: 830.7, w: 137.2, h: 167.5, z: 61, depth: 1.07, anchor: [0.7124, 0.5375],
    dot: [1333, 852], side: 'right', path: 'hv', worn: [1076, 430, 0.45, -18] },
  // worn on the person: clicking the neck / the label opens it; the product loop shows in the detail view
  { id: 'necklace', label: 'Necklace', cat: 'neck', title: 'The Golden Note', price: 72, colorName: 'Gold tone', color: '#c19a50',
    desc: 'A delicate chain and an understated pendant — a small point of warmth, close to you.',
    onPerson: true, anchorDesign: [742, 338], hitDesign: [742, 330, 46], focusX: 905, focusY: 292,
    x: 742, y: 330, w: 150, h: 160, z: 45, depth: 0.92,
    dot: [891, 277], side: 'right', path: 'vh' },
];

// two extra live instances of the ring loop (same decoded texture) for the "Rings" bracket
export const RING_EXTRAS = [
  { x: 416, y: 438, w: 31, h: 28.3, rot: 24, flip: -1, z: 57.5, depth: 1.1, bias: 0.2 },
  { x: 423, y: 538, w: 28, h: 25.6, rot: -32, flip: 1, z: 57.6, depth: 1.12, bias: 0.4 },
];

export const CATEGORIES = {
  head: { label: 'Head', ids: ['cap', 'headphones'] },
  face: { label: 'Face', ids: ['sunglasses', 'earrings'] },
  neck: { label: 'Neck', ids: ['necklace'] },
  hands: { label: 'Hands', ids: ['watch', 'ring'] },
  bag: { label: 'Bag', ids: ['bag', 'keychain'] },
  essentials: { label: 'Essentials', ids: ['fragrance', 'phone-case'] },
};

// decorative layers (positions tuned against the reference)
export const PARTICLES = [{"x": 996, "y": 348, "w": 22, "h": 20.09, "rot": 10, "sub": [0.01042, 0.03438, 0.3125, 0.42812], "bias": 0.5, "z": 30, "depth": 0.88, "opacity": 0.95}, {"x": 979, "y": 488, "w": 14, "h": 12.41, "rot": -20, "sub": [0.01042, 0.54063, 0.3125, 0.41563], "bias": 1.0, "z": 30, "depth": 0.86, "opacity": 0.9}, {"x": 886, "y": 628, "w": 18, "h": 17.15, "rot": 35, "sub": [0.34375, 0.02813, 0.31042, 0.44375], "bias": 0.7, "z": 30, "depth": 0.9, "opacity": 0.95}, {"x": 935, "y": 678, "w": 17, "h": 14.73, "rot": -10, "sub": [0.67708, 0.04688, 0.3125, 0.40625], "bias": 0.7, "z": 30, "depth": 0.9, "opacity": 0.95}, {"x": 1160, "y": 466, "w": 40, "h": 36.53, "rot": 25, "sub": [0.01042, 0.03438, 0.3125, 0.42812], "bias": 2.4, "z": 29, "depth": 0.8, "opacity": 0.7}, {"x": 1116, "y": 690, "w": 12, "h": 10.64, "rot": 0, "sub": [0.01042, 0.54063, 0.3125, 0.41563], "bias": 1.0, "z": 30, "depth": 0.9, "opacity": 0.9}, {"x": 1290, "y": 330, "w": 13, "h": 12.39, "rot": 40, "sub": [0.34375, 0.02813, 0.31042, 0.44375], "bias": 1.8, "z": 29, "depth": 0.78, "opacity": 0.75}, {"x": 668, "y": 108, "w": 10, "h": 8.67, "rot": 0, "sub": [0.67708, 0.04688, 0.3125, 0.40625], "bias": 1.4, "z": 29, "depth": 0.8, "opacity": 0.8}, {"x": 870, "y": 213, "w": 9, "h": 7.98, "rot": 30, "sub": [0.01042, 0.54063, 0.3125, 0.41563], "bias": 1.6, "z": 29, "depth": 0.8, "opacity": 0.75}, {"x": 585, "y": 432, "w": 30, "h": 28.0, "rot": 28, "sub": [0.67708, 0.53125, 0.3125, 0.4375], "bias": 0.3, "z": 31, "depth": 0.95, "opacity": 1.0}, {"x": 553, "y": 404, "w": 9, "h": 8.58, "rot": 0, "sub": [0.34375, 0.02813, 0.31042, 0.44375], "bias": 1.2, "z": 30, "depth": 0.9, "opacity": 0.85}, {"x": 452, "y": 600, "w": 11, "h": 9.53, "rot": -35, "sub": [0.67708, 0.04688, 0.3125, 0.40625], "bias": 1.5, "z": 30, "depth": 0.85, "opacity": 0.8}, {"x": 530, "y": 643, "w": 26, "h": 24.78, "rot": -15, "sub": [0.34375, 0.02813, 0.31042, 0.44375], "bias": 0.3, "z": 72, "depth": 1.12, "opacity": 1.0}, {"x": 549, "y": 733, "w": 44, "h": 40.19, "rot": 40, "sub": [0.01042, 0.03438, 0.3125, 0.42812], "bias": 0.9, "z": 73, "depth": 1.16, "opacity": 0.95}, {"x": 1005, "y": 785, "w": 34, "h": 29.47, "rot": -30, "sub": [0.67708, 0.04688, 0.3125, 0.40625], "bias": 0.5, "z": 72, "depth": 1.12, "opacity": 1.0}, {"x": 625, "y": 845, "w": 28, "h": 24.83, "rot": 20, "sub": [0.01042, 0.54063, 0.3125, 0.41563], "bias": 1.6, "z": 74, "depth": 1.18, "opacity": 0.9}, {"x": 637, "y": 943, "w": 54, "h": 49.32, "rot": -40, "sub": [0.01042, 0.03438, 0.3125, 0.42812], "bias": 3.0, "z": 76, "depth": 1.24, "opacity": 0.85}, {"x": 858, "y": 990, "w": 30, "h": 28.59, "rot": 15, "sub": [0.34375, 0.02813, 0.31042, 0.44375], "bias": 2.2, "z": 75, "depth": 1.2, "opacity": 0.8}, {"x": 1212, "y": 905, "w": 16, "h": 14.19, "rot": -12, "sub": [0.01042, 0.54063, 0.3125, 0.41563], "bias": 1.4, "z": 72, "depth": 1.1, "opacity": 0.85}];
export const RIBBONS = [{"src": "media/ribbon-front.mp4", "poster": "media/ribbon-front.webp", "x": 430, "y": 622, "w": 470, "h": 278, "rot": -7, "flip": -1, "z": 12, "depth": 0.8, "opacity": 0.78, "bias": 0.5, "lift": 0.1, "edge": [0.1, 0.12, 0.08, 0.1]}, {"src": "media/ribbon-back.mp4", "poster": "media/ribbon-back.webp", "x": 1150, "y": 602, "w": 360, "h": 520, "rot": 78, "flip": 1, "z": 11, "depth": 0.8, "opacity": 0.74, "bias": 0.6, "lift": 0.1, "edge": [0.06, 0.06, 0.05, 0.12]}, {"src": "media/ribbon-front.mp4", "poster": "media/ribbon-front.webp", "x": 845, "y": 905, "w": 780, "h": 461, "rot": 17, "flip": 1, "z": 80, "depth": 1.22, "opacity": 0.62, "bias": 1.4, "lift": 0.05, "edge": [0.1, 0.12, 0.1, 0.1]}];
