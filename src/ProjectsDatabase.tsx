export interface ProjectData {
  category: string;
  //* Titles are used as keys
  title: string;
  subtitle: string;
  year: string;
  description: string;
  // * Media [0] is used as hero and should be 1:2~. the rest are used in gallery view
  media: string[];
  link?: string;
  linkText?: string;
}

export const ProjectCategories: readonly string[] = [
  "Favorites",
  "Spatial",
  "Other",
];

export const ProjectDatabase: readonly ProjectData[] = [
  {
    category: "Favorites",
    title: "Animal Company",
    subtitle: "#1 VR Game on Quest",
    year: "25",
    description: `1 Million monthly players, 400k+ Discord community, #1 seller of 2025.

Animal Company is a chaotic virtual playground. Players socialize, explode each other, build contraptions, and go on spooky adventures.

I directed the game from concept to #1 seller on quest. A chaotic, janky artifact of an amazing, passionate team. We threw everything at the wall and somehow built a space kids genuinely loved socializing in.`,
    media: [
      "ac/ac_hero.png",
      "ac/ac_1.png",
      "ac/ac_2.mp4",
      "ac/ac_3.png",
      "ac/ac_4.mp4",
      "ac/ac_5.png",
      "ac/ac_last.mp4",
      "ac/ac_6.png",
      "ac/ac_7.png",
      "ac/ac_8.png",
    ],
    link: "https://www.meta.com/experiences/animal-company/7190422614401072/",
    linkText: "Available on Meta Quest",
  },

  {
    category: "Favorites",
    title: "Gridform",
    subtitle: "Published Indie Game",
    year: "22",
    description: `Inspired by Geometry Wars, Gridform is the largest solo project I’ve worked on. The game contains over 75 uniquely designed levels filled with over-stimulating visuals.

The project was started mid 2020 and took about 2 years of development before being published in July 2022. Created in Unity.`,
    media: [
      "gridform/gfHero.png",
      "gridform/gfGallery1.jpg",
      "gridform/gf_vid_1.webm",
      "gridform/gfGallery6.jpg",
      "gridform/gf_vid_2.webm",
      "gridform/gfGallery3.jpg",
      "gridform/gf_vid_3.webm",
      "gridform/gfGallery4.jpg",
      "gridform/gfGallery5.jpg",
      "gridform/gfGallery2.jpg",
    ],
    link: "https://store.steampowered.com/app/1608710/Gridform/",
    linkText: "Available on Steam",
  },

  {
    category: "Favorites",
    title: "The Gauntlet",
    subtitle: "UE4 Game",
    year: "20",
    description: `A hardcore platformer with the emphasis on fast fps movement. Inspired by the likes of bunnyhop and rocket jump maps, the game consists of 20 challenges with increasing difficulty.
    
    Created in Unreal Engine for a college project during 2020.`,
    media: [
      "gauntlet/gHero.jpg",
      "gauntlet/g1.gif",
      "gauntlet/g2.png",
      "gauntlet/g3.png",
      "gauntlet/g4.png",
      "gauntlet/g5.png",
    ],
    link: "https://sherbb.itch.io/the-gauntlet",
    linkText: "Available on Itch",
  },

  {
    category: "Favorites",
    title: "Loot Corp",
    subtitle: "My First Game",
    year: "19",
    description: `This was the first "substantial" game I ever finished. It was created using Construct 3 in the fall of 2019.

Fight through a complex full of enemies. Cover the screen in blood and search for the exit.`,
    media: [
      "lootcorp/lcHero.png",
      "lootcorp/lcG1.gif",
      "lootcorp/lc1.png",
      "lootcorp/lc2.png",
      "lootcorp/lc3.png",
    ],
    link: "https://sherbb.itch.io/lootcorp",
    linkText: "Available on Itch",
  },

  {
    category: "Spatial",
    title: "Spatial.io",
    subtitle: "Social Gaming Platform",
    year: "22",
    description: `Spatial was born as an AR/VR meeting and conferencing app, but was reformed into a web-based social gaming platform with my help.

On Spatial you can play games, earn items and collectables, and make friends. Every game on Spatial is built upon the Multiplayer Spatial Engine which itself is built in Unity.`,
    media: ["spatial/platformHero.jpg"],
    link: "https://www.spatial.io/",
    linkText: "Spatial.io",
  },

  {
    category: "Spatial",
    title: "Creator Toolkit",
    subtitle: "Unity UGC SDK",
    year: "22",
    description:
`The Creator Toolkit allows you to create games, environments, items, and avatars inside of Unity and upload them to Spatial.

The Toolkit comes with tons of interactive components, validation, and cross platform C# and Visual scripting.`,
    media: ["spatial/toolkitHero.jpg"],
    link: "https://docs.spatial.io/",
    linkText: "docs.spatial.io",
  },

  {
    category: "Spatial",
    title: "Shooty Shooty",
    subtitle: "Action Roguelike",
    year: "23",
    description:
`The first action game created on Spatial. A micro-roguelike where you battle hundreds of skulls in an arena. Collect powerups until you become a bullet hose. And get showered in particles and coins.`,
    media: [
      "spatial/ssHero.jpg",
      "spatial/ss1.jpg",
      "spatial/ss2.jpg",
      "spatial/ss3.jpg",
      "spatial/ss4.jpg",
      "spatial/ss5.jpg",
      "spatial/ss6.jpg",
      "spatial/ss7.jpg",
      "spatial/ss8.jpg",
    ],
    link: "https://www.spatial.io/s/SHOOTY-SHOOTY-65020b034b3117f026aa55be?share=8704828209464503502",
    linkText: "Play on Spatial",
  },

  {
    category: "Spatial",
    title: "Punch Hero",
    subtitle: "Idle Clicker",
    year: "23",
    description:
`An idle clicker where you gain strength, collect pets, and destroy thousands of brick walls. On of the first games created for Spatial using the Creator Toolkit.`,
    media: [
      "spatial/phHero.jpg",
      "spatial/ph1.jpg",
      "spatial/ph2.jpg",
      "spatial/ph3.jpg",
      "spatial/ph4.jpg",
    ],
    link: "https://www.spatial.io/s/Punch-Hero-6491dbd9e551e16bb8789f04?share=751854760327213089",
    linkText: "Play on Spatial",
  },

  {
    category: "Other",
    title: "Less3",
    subtitle: "3D Design Studio",
    year: "??",
    description: `I publish independent projects and games under the name Less3.`,
    media: ["l3/l3_hero.png"],
    link: "https://less3.design/",
    linkText: "Check out Less3.design",
  },

  {
    category: "Other",
    title: "This Website",
    subtitle: "Custom React App",
    year: "23",
    description: `The website you are currently looking at is a custom react app designed and programmed by yours truly.`,
    media: ["website/webHero.png"],
    link: "https://github.com/Sherbb/sherbb.github.io",
    linkText: "View the Source",
  },

  {
    category: "Other",
    title: "Itch Games",
    subtitle: "Small College Projects",
    year: "21",
    description: `I went to college for "Computer Game Design" and in that time created many small games for various classes and projects.
        
My favorite solo games are posted to my Itch page.`,
    media: ["itch/iHero.jpg"],
    link: "https://sherbb.itch.io/",
    linkText: "sherbb.itch.io",
  },

  {
    category: "Other",
    title: "Music",
    subtitle: "Experimental",
    year: "22",
    description: `When I am not busy making games I sometimes create electronic music. Usually it's created for those previously mentioned games.`,
    media: ["music/mHero.jpg"],
    link: "https://sherbb.bandcamp.com/",
    linkText: "sherbb.bandcamp.com",
  },
];
