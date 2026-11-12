export type Speaker = "earth" | "moon";

export interface StoryStep {
  id: number;
  scene: number;
  sceneTitle: string;
  speaker: Speaker;
  text: string;
  emotion?: string;
  timeline?: string;
  visualCue?: string;
  // 3D stage/animation state identifier
  action:
    | "lonely_space"
    | "launch"
    | "drop_sic"
    | "drop_les"
    | "drop_sii"
    | "transposition"
    | "drop_s4b"
    | "orbit_undock"
    | "landed"
    | "ascent_liftoff"
    | "ascent_crash"
    | "service_burn"
    | "splashdown"
    | "monument_wide";
}

export const storySteps: StoryStep[] = [
  // Scene 1: The Lonely Moon
  {
    id: 1,
    scene: 1,
    sceneTitle: "Scene 1: The Lonely Moon",
    speaker: "earth",
    text: "Why are you sad, Moon?",
    visualCue: "3D view of the Earth and the Moon in space. The Moon looks dark, quiet, and empty.",
    action: "lonely_space",
  },
  {
    id: 2,
    scene: 1,
    sceneTitle: "Scene 1: The Lonely Moon",
    speaker: "moon",
    text: "Oh Earth, you have so many people. Animals and plants live inside you. I have none. I am just empty rocks and dust.",
    action: "lonely_space",
  },
  {
    id: 3,
    scene: 1,
    sceneTitle: "Scene 1: The Lonely Moon",
    speaker: "earth",
    emotion: "Laughs a little",
    text: "Hahaha, Moon, you are so silly.",
    action: "lonely_space",
  },
  {
    id: 4,
    scene: 1,
    sceneTitle: "Scene 1: The Lonely Moon",
    speaker: "moon",
    emotion: "Looks annoyed and angry",
    text: "It is not a joke! I am lonely.",
    action: "lonely_space",
  },
  {
    id: 5,
    scene: 1,
    sceneTitle: "Scene 1: The Lonely Moon",
    speaker: "earth",
    emotion: "Smiles gently",
    text: "I understand. But don't worry. Humans are going to you.",
    action: "lonely_space",
  },
  {
    id: 6,
    scene: 1,
    sceneTitle: "Scene 1: The Lonely Moon",
    speaker: "moon",
    emotion: "Shocked",
    text: "How? How is that possible?",
    action: "lonely_space",
  },

  // Scene 2: Leaving Earth (Dropping the Weight)
  {
    id: 7,
    scene: 2,
    sceneTitle: "Scene 2: Leaving Earth (Dropping the Weight)",
    timeline: "T+ 00:00:00",
    speaker: "earth",
    text: "My humans built a giant rocket called the Saturn V. But space travel is very hard. To reach you, they couldn't bring the whole rocket. They had to leave heavy pieces behind along the way.",
    visualCue: "3D animation of the giant Saturn V rocket launching.",
    action: "launch",
  },
  {
    id: 8,
    scene: 2,
    sceneTitle: "Scene 2: Leaving Earth (Dropping the Weight)",
    timeline: "T+ 00:00:00",
    speaker: "moon",
    text: "What did they leave?",
    action: "launch",
  },
  {
    id: 9,
    scene: 2,
    sceneTitle: "Scene 2: Leaving Earth (Dropping the Weight)",
    timeline: "T+ 00:00:00",
    speaker: "earth",
    text: "Lots of things! Let me show you...",
    action: "launch",
  },
  {
    id: 10,
    scene: 2,
    sceneTitle: "Scene 2: Leaving Earth (Dropping the Weight)",
    timeline: "T+ 02:44",
    speaker: "earth",
    text: "Just 2 minutes and 44 seconds after launch, the huge **First Stage (S-IC)** ran out of fuel. It disconnected and fell into my Atlantic Ocean. It was destroyed.",
    visualCue: "Rocket reaches 67 km altitude. The bottom part of the rocket falls off.",
    action: "drop_sic",
  },
  {
    id: 11,
    scene: 2,
    sceneTitle: "Scene 2: Leaving Earth (Dropping the Weight)",
    timeline: "T+ 03:18",
    speaker: "earth",
    text: "At 3 minutes and 18 seconds, they threw away the **Launch Escape System (LES)**. It was a 4,000 kg safety shield. By dropping this heavy weight, the astronauts could finally see sunlight through their windows for the first time! This shield also fell into the ocean.",
    visualCue: "The pointy escape tower on top flies off.",
    action: "drop_les",
  },
  {
    id: 12,
    scene: 2,
    sceneTitle: "Scene 2: Leaving Earth (Dropping the Weight)",
    timeline: "T+ 09:12",
    speaker: "earth",
    text: "At 9 minutes, flying at 24,600 km/h, the **Second Stage (S-II)** separated. It burned up in my sky from friction and crashed into the ocean.",
    visualCue: "The middle of the rocket falls off.",
    action: "drop_sii",
  },

  // Scene 3: The Dance in Deep Space
  {
    id: 13,
    scene: 3,
    sceneTitle: "Scene 3: The Dance in Deep Space",
    timeline: "T+ 03:15:00",
    speaker: "moon",
    text: "So they threw almost everything away just to escape your gravity?",
    visualCue: "The rocket is in deep space. The Command Module turns around to dock with the Lunar Module.",
    action: "transposition",
  },
  {
    id: 14,
    scene: 3,
    sceneTitle: "Scene 3: The Dance in Deep Space",
    timeline: "T+ 03:15:00",
    speaker: "earth",
    text: "Yes! After they fired their engine to head towards you (Translunar Injection), they did a careful dance in space. The main ship pulled the small Lunar Module (Eagle) out of its garage.",
    action: "transposition",
  },
  {
    id: 15,
    scene: 3,
    sceneTitle: "Scene 3: The Dance in Deep Space",
    timeline: "T+ 03:15:00",
    speaker: "moon",
    text: "What happened to the empty garage?",
    action: "drop_s4b",
  },
  {
    id: 16,
    scene: 3,
    sceneTitle: "Scene 3: The Dance in Deep Space",
    timeline: "T+ 03:15:00",
    speaker: "earth",
    text: "That was the **Third Stage (S-IVB)**. Once the astronauts pulled the Lunar Module free, they shot the empty Third Stage away. It didn't crash into me, and it didn't crash into you. It was sent into a solar orbit. It is still floating around the Sun in deep space to this day!",
    action: "drop_s4b",
  },

  // Scene 4: Arrival and Separation
  {
    id: 17,
    scene: 4,
    sceneTitle: "Scene 4: Arrival and Separation",
    timeline: "T+ 100:12:00",
    speaker: "earth",
    text: "After 100 hours, they finally reached you. While flying over your far side, the small Lunar Module separated from the main ship. Two astronauts went down to meet you.",
    visualCue: "The spaceship is orbiting the Moon. The Eagle separates from the main ship.",
    action: "orbit_undock",
  },

  // Scene 5: The Greatest Monument (The Lunar Surface)
  {
    id: 18,
    scene: 5,
    sceneTitle: "Scene 5: The Greatest Monument (The Lunar Surface)",
    timeline: "T+ 124:22:00",
    speaker: "moon",
    text: "They really came! They walked on me. But then... they left. Now I am empty again.",
    visualCue: "The Lunar Module lands on the Moon.",
    action: "landed",
  },
  {
    id: 19,
    scene: 5,
    sceneTitle: "Scene 5: The Greatest Monument (The Lunar Surface)",
    timeline: "T+ 124:22:00",
    speaker: "earth",
    text: "No, you are not empty. Look closely at what they left behind on your surface.",
    action: "ascent_liftoff",
  },
  {
    id: 20,
    scene: 5,
    sceneTitle: "Scene 5: The Greatest Monument (The Lunar Surface)",
    timeline: "T+ 124:22:00",
    speaker: "moon",
    text: "They left the bottom half of their ship!",
    action: "ascent_liftoff",
  },
  {
    id: 21,
    scene: 5,
    sceneTitle: "Scene 5: The Greatest Monument (The Lunar Surface)",
    timeline: "T+ 124:22:00",
    speaker: "earth",
    text: "Yes, that is the **Descent Stage**. To fly back home, they used that bottom half as a permanent launchpad. Because you have no wind or rain, that golden metal stage will sit on your surface forever.",
    action: "ascent_liftoff",
  },

  // Scene 6: The Final Goodbyes
  {
    id: 22,
    scene: 6,
    sceneTitle: "Scene 6: The Final Goodbyes",
    timeline: "T+ 130:09:31",
    speaker: "earth",
    text: "When the astronauts got back to the main ship in orbit, they moved all your moon rocks inside. Then, they threw away the empty **Ascent Stage**. It floated in your orbit for a while, but eventually, your gravity pulled it down. It crashed into your surface.",
    visualCue: "The top half of the Lunar Module (Ascent Stage) docks with the main ship, transfers rocks, and is then pushed away.",
    action: "ascent_crash",
  },
  {
    id: 23,
    scene: 6,
    sceneTitle: "Scene 6: The Final Goodbyes",
    timeline: "T+ 130:09:31",
    speaker: "moon",
    text: "And what about the main ship? How did they land safely on you?",
    action: "ascent_crash",
  },
  {
    id: 24,
    scene: 6,
    sceneTitle: "Scene 6: The Final Goodbyes",
    timeline: "T+ 194:49:12",
    speaker: "earth",
    text: "Just 15 minutes before they reached my atmosphere, they threw away the **Service Module**. It was torn apart and completely burned up in my sky. Only the tiny Command Module, protected by a heat shield, safely splashed into my ocean.",
    visualCue: "The Service module separates near Earth and burns up.",
    action: "service_burn",
  },

  // Scene 7: A Museum of Courage
  {
    id: 25,
    scene: 7,
    sceneTitle: "Scene 7: A Museum of Courage",
    speaker: "moon",
    text: "So... the oceans, the Sun, and I... we are all holding pieces of this great journey?",
    visualCue: "The camera pans out to show the whole Moon, zooming in slightly on the tiny glowing spot where the Descent Stage sits peacefully in the dark.",
    action: "monument_wide",
  },
  {
    id: 26,
    scene: 7,
    sceneTitle: "Scene 7: A Museum of Courage",
    speaker: "earth",
    text: "Exactly. My oceans hide the early rocket stages. The Sun holds the Third Stage. But you, Moon... you hold the most important monument of all. The Descent Stage and the crashed Ascent Stage.",
    action: "monument_wide",
  },
  {
    id: 27,
    scene: 7,
    sceneTitle: "Scene 7: A Museum of Courage",
    speaker: "moon",
    emotion: "Smiling",
    text: "I guess I am not just empty rocks and dust anymore. I am a museum of human courage.",
    action: "monument_wide",
  },
  {
    id: 28,
    scene: 7,
    sceneTitle: "Scene 7: A Museum of Courage",
    speaker: "earth",
    text: "Yes, Moon. You are the keeper of our greatest adventure.",
    action: "monument_wide",
  },
];
