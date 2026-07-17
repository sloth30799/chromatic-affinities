export type SceneKind = "navyApricot" | "mossOrchid" | "emberGlacier" | "cacaoIvory";

export type Hotspot = {
  id: string;
  title: string;
  note: string;
  fact: string;
  x: number;
  y: number;
  align?: "left" | "right" | "center";
};

export type Chapter = {
  number: string;
  id: string;
  scene: SceneKind;
  from: { name: string; hex: string; atmosphere: string };
  to: { name: string; hex: string; atmosphere: string };
  transformation: string;
  dek: string;
  hotspots: Hotspot[];
};

export const exhibitionTitle = "Chromatic Affinities";
export const exhibitionIntro =
  "A fullscreen interactive exhibition exploring four pairs of colors as eight interconnected worlds.";

export const chapters: Chapter[] = [
  {
    number: "01",
    id: "navy-apricot",
    scene: "navyApricot",
    from: {
      name: "Midnight Navy",
      hex: "#071A2D",
      atmosphere: "Deep ocean · ink · moonlit feathers",
    },
    to: {
      name: "Solar Apricot",
      hex: "#FFB36B",
      atmosphere: "Peaches · terracotta · desert candlelight",
    },
    transformation: "underwater moon / peach sun",
    dek: "Moonlight sinks through ink-blue water, then lifts warm as a fruit held to the sun.",
    hotspots: [
      {
        id: "raven-feather",
        title: "Raven feather",
        note: "A blue-black vane catches its own small piece of night.",
        fact: "Near-black feathers can appear blue when their microscopic structure scatters shorter wavelengths.",
        x: 18,
        y: 62,
        align: "left",
      },
      {
        id: "night-flower",
        title: "Night flower",
        note: "Its petals are a slow punctuation in the tide.",
        fact: "Many night-blooming flowers use pale petals and scent to guide moth pollinators after dusk.",
        x: 31,
        y: 77,
        align: "left",
      },
      {
        id: "peach-stone",
        title: "Peach stone",
        note: "A rough little planet inside all that velvet light.",
        fact: "Apricot and peach pigments get much of their warm color from carotenoids.",
        x: 76,
        y: 66,
        align: "right",
      },
    ],
  },
  {
    number: "02",
    id: "moss-orchid",
    scene: "mossOrchid",
    from: {
      name: "Moss Verdant",
      hex: "#38523B",
      atmosphere: "Ferns · lichen · wet stone",
    },
    to: {
      name: "Electric Orchid",
      hex: "#C377FF",
      atmosphere: "Amethyst · ultraviolet · twilight haze",
    },
    transformation: "moss stone / orchid",
    dek: "A rain-dark stone learns the syntax of a flower: weight becomes radiance, spore becomes signal.",
    hotspots: [
      {
        id: "lichen-map",
        title: "Lichen map",
        note: "A continent drawn patiently on a damp shoulder of stone.",
        fact: "Lichens are partnerships between fungi and photosynthetic algae or cyanobacteria.",
        x: 22,
        y: 68,
        align: "left",
      },
      {
        id: "beetle-wing",
        title: "Beetle wing",
        note: "Green is not painted on; it is folded into light.",
        fact: "Many beetle wing colors are structural, produced by tiny layers that reflect selected wavelengths.",
        x: 71,
        y: 74,
        align: "right",
      },
      {
        id: "orchid-throat",
        title: "Orchid throat",
        note: "A velvet aperture where the forest turns ultraviolet.",
        fact: "Some orchids show ultraviolet markings that are visible to pollinating insects but not to human eyes.",
        x: 59,
        y: 40,
        align: "right",
      },
    ],
  },
  {
    number: "03",
    id: "ember-glacier",
    scene: "emberGlacier",
    from: {
      name: "Vermilion Ember",
      hex: "#E4472E",
      atmosphere: "Fire · lacquer · red clay",
    },
    to: {
      name: "Glacier Cyan",
      hex: "#8FE7F2",
      atmosphere: "Ice glass · alpine water · winter sky",
    },
    transformation: "ember / ice crystal",
    dek: "The ember holds its breath. Heat suspends, edges sharpen, and a red memory turns to lucid ice.",
    hotspots: [
      {
        id: "poppy",
        title: "Lacquer poppy",
        note: "A red bowl holding the afterimage of a flame.",
        fact: "Poppy reds often come from anthocyanin pigments, whose color can shift with acidity.",
        x: 20,
        y: 70,
        align: "left",
      },
      {
        id: "koi-scale",
        title: "Koi scale",
        note: "A small copper mirror under moving water.",
        fact: "Fish scales can use guanine crystals to create reflective, metallic-looking highlights.",
        x: 76,
        y: 69,
        align: "right",
      },
      {
        id: "ice-facet",
        title: "Ice facet",
        note: "Cold makes a geometry out of every last spark.",
        fact: "Ice looks blue in thick layers because water absorbs red light more readily than blue light.",
        x: 61,
        y: 36,
        align: "right",
      },
    ],
  },
  {
    number: "04",
    id: "cacao-ivory",
    scene: "cacaoIvory",
    from: {
      name: "Cacao Earth",
      hex: "#4A2C24",
      atmosphere: "Cocoa · walnut · soil · pottery",
    },
    to: {
      name: "Porcelain Ivory",
      hex: "#F3E8D3",
      atmosphere: "Shells · handmade paper · pale cloud",
    },
    transformation: "cacao pod / porcelain bloom",
    dek: "Earth splits gently open: seed, clay, and coffee grounds rise into a pale made thing.",
    hotspots: [
      {
        id: "cacao-ridge",
        title: "Cacao ridge",
        note: "A dark husk, ribbed like a vessel made by rain.",
        fact: "Cacao pods grow directly from the trunks and branches of cacao trees, a habit called cauliflory.",
        x: 22,
        y: 70,
        align: "left",
      },
      {
        id: "walnut-shell",
        title: "Walnut shell",
        note: "Every crease is a small archive of pressure and weather.",
        fact: "Walnut shells are rich in lignin, the tough polymer that gives woody material its rigidity.",
        x: 72,
        y: 72,
        align: "right",
      },
      {
        id: "porcelain-edge",
        title: "Porcelain edge",
        note: "White, but never empty: a cloud of mineral and handwork.",
        fact: "Porcelain gains its translucent quality from high-fired kaolin clay and vitrification.",
        x: 60,
        y: 37,
        align: "right",
      },
    ],
  },
];
