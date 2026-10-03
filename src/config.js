export const ROOM = { width: 36, depth: 24, height: 5 };

export const CATS = [
  {
    id: "piet",
    name: "Piet",
    speed: 3.9,
    sprint: 5.6,
    jumpVelocity: 6.5,
    radius: 0.42,
    body: { length: 1.05, height: 0.48, width: 0.40 },
    colors: { base: 0x81756c, dark: 0x342e2a, white: 0xf3f1ea, eye: 0x9ec38c },
    markings: { whiteFace: true, whiteChest: true, whitePaws: true },
    tail: { length: 1.35, thickness: 0.075, segments: 10 },
    description: "älter, schlank, langer Schwanz"
  },
  {
    id: "zelda",
    name: "Zelda",
    speed: 4.5,
    sprint: 6.2,
    jumpVelocity: 7.0,
    radius: 0.38,
    body: { length: 0.92, height: 0.43, width: 0.36 },
    colors: { base: 0x745d47, dark: 0x2b241e, white: 0xf3f1ea, eye: 0xaabd72 },
    markings: { whiteFace: false, whiteChest: false, whitePaws: false },
    tail: { length: 1.25, thickness: 0.09, segments: 11 },
    description: "klein, agil, komplett getigert"
  },
  {
    id: "yuki",
    name: "Yuki",
    speed: 3.6,
    sprint: 5.0,
    jumpVelocity: 6.0,
    radius: 0.46,
    body: { length: 1.00, height: 0.52, width: 0.46 },
    colors: { base: 0x81736a, dark: 0x312b27, white: 0xf4f2ec, eye: 0xb9bd78 },
    markings: { whiteFace: true, whiteChest: true, whitePaws: true },
    tail: { length: 0.34, thickness: 0.085, segments: 4 },
    description: "kräftiger, kurzer Schwanz"
  }
];
