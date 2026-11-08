export type Speaker = "earth" | "moon";

export interface DialogueItem {
  speaker: Speaker;
  text: string;
  emotion?: string;
}

export interface StorySection {
  id: string;
  timeline?: string;
  visualCue?: string;
  dialogue: DialogueItem[];
}

export interface SceneData {
  id: number;
  title: string;
  subtitle: string;
  timeline?: string;
  visualCue: string;
  sections: StorySection[];
}

export const storyScenes: SceneData[] = [
  {
    id: 1,
    title: "Scene 1: The Lonely Moon",
    subtitle: "A quiet conversation across 384,400 kilometers of space",
    visualCue: "3D view of the Earth and the Moon in space. The Moon looks dark, quiet, and empty.",
    sections: [
      {
        id: "scene-1-main",
        visualCue: "Earth and the Moon gazing at each other across the dark cosmos.",
        dialogue: [
          { speaker: "earth", text: "Why are you sad, Moon?" },
          {
            speaker: "moon",
            text: "Oh Earth, you have so many people. Animals and plants live inside you. I have none. I am just empty rocks and dust.",
          },
          {
            speaker: "earth",
            emotion: "Laughs a little",
            text: "Hahaha, Moon, you are so silly.",
          },
          {
            speaker: "moon",
            emotion: "Looks annoyed and angry",
            text: "It is not a joke! I am lonely.",
          },
          {
            speaker: "earth",
            emotion: "Smiles gently",
            text: "I understand. But don't worry. Humans are going to you.",
          },
          {
            speaker: "moon",
            emotion: "Shocked",
            text: "How? How is that possible?",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Scene 2: Leaving Earth (Dropping the Weight)",
    subtitle: "The giant Saturn V leaves its heavy armor behind",
    timeline: "T+ 00:00:00",
    visualCue: "A 3D animation of the giant Saturn V rocket launching.",
    sections: [
      {
        id: "scene-2-launch",
        timeline: "T+ 00:00:00",
        visualCue: "The Saturn V rocket ignites its mighty F-1 engines and lifts off.",
        dialogue: [
          {
            speaker: "earth",
            text: "My humans built a giant rocket called the Saturn V. But space travel is very hard. To reach you, they couldn't bring the whole rocket. They had to leave heavy pieces behind along the way.",
          },
          {
            speaker: "moon",
            text: "What did they leave?",
          },
          {
            speaker: "earth",
            text: "Lots of things! Let me show you...",
          },
        ],
      },
      {
        id: "scene-2-sic",
        timeline: "T+ 02:44",
        visualCue: "Rocket reaches 67 km altitude. The bottom First Stage (S-IC) falls off.",
        dialogue: [
          {
            speaker: "earth",
            text: "Just 2 minutes and 44 seconds after launch, the huge **First Stage (S-IC)** ran out of fuel. It disconnected and fell into my Atlantic Ocean. It was destroyed.",
          },
        ],
      },
      {
        id: "scene-2-les",
        timeline: "T+ 03:18",
        visualCue: "The pointy escape tower on top flies off.",
        dialogue: [
          {
            speaker: "earth",
            text: "At 3 minutes and 18 seconds, they threw away the **Launch Escape System (LES)**. It was a 4,000 kg safety shield. By dropping this heavy weight, the astronauts could finally see sunlight through their windows for the first time! This shield also fell into the ocean.",
          },
        ],
      },
      {
        id: "scene-2-sii",
        timeline: "T+ 09:12",
        visualCue: "The middle of the rocket (S-II) separates at 24,600 km/h.",
        dialogue: [
          {
            speaker: "earth",
            text: "At 9 minutes, flying at 24,600 km/h, the **Second Stage (S-II)** separated. It burned up in my sky from friction and crashed into the ocean.",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Scene 3: The Dance in Deep Space",
    subtitle: "Transposition, docking, and an eternal voyage around the Sun",
    timeline: "T+ 03:15:00",
    visualCue: "The rocket is in deep space. The Command Module turns around to dock with the Lunar Module.",
    sections: [
      {
        id: "scene-3-main",
        timeline: "T+ 03:15:00",
        visualCue: "Command & Service Module turns around 180 degrees to pull the Lunar Module out of the S-IVB stage.",
        dialogue: [
          {
            speaker: "moon",
            text: "So they threw almost everything away just to escape your gravity?",
          },
          {
            speaker: "earth",
            text: "Yes! After they fired their engine to head towards you (Translunar Injection), they did a careful dance in space. The main ship pulled the small Lunar Module (Eagle) out of its garage.",
          },
          {
            speaker: "moon",
            text: "What happened to the empty garage?",
          },
          {
            speaker: "earth",
            text: "That was the **Third Stage (S-IVB)**. Once the astronauts pulled the Lunar Module free, they shot the empty Third Stage away. It didn't crash into me, and it didn't crash into you. It was sent into a solar orbit. It is still floating around the Sun in deep space to this day!",
          },
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Scene 4: Arrival and Separation",
    subtitle: "Two astronauts begin their descent to the lunar surface",
    timeline: "T+ 100:12:00",
    visualCue: "The spaceship is orbiting the Moon. The Eagle separates from the main ship.",
    sections: [
      {
        id: "scene-4-main",
        timeline: "T+ 100:12:00",
        visualCue: "In lunar orbit, the Lunar Module 'Eagle' detaches from Columbia and prepares for landing.",
        dialogue: [
          {
            speaker: "earth",
            text: "After 100 hours, they finally reached you. While flying over your far side, the small Lunar Module separated from the main ship. Two astronauts went down to meet you.",
          },
        ],
      },
    ],
  },
  {
    id: 5,
    title: "Scene 5: The Greatest Monument (The Lunar Surface)",
    subtitle: "A golden launchpad left behind for eternity",
    timeline: "T+ 124:22:00",
    visualCue: "The Lunar Module lands on the Moon. The top half shoots up, leaving the golden bottom half on the ground.",
    sections: [
      {
        id: "scene-5-main",
        timeline: "T+ 124:22:00",
        visualCue: "The Descent Stage rests on the Sea of Tranquility as the Ascent Stage launches back into space.",
        dialogue: [
          {
            speaker: "moon",
            text: "They really came! They walked on me. But then... they left. Now I am empty again.",
          },
          {
            speaker: "earth",
            text: "No, you are not empty. Look closely at what they left behind on your surface.",
          },
          {
            speaker: "moon",
            text: "They left the bottom half of their ship!",
          },
          {
            speaker: "earth",
            text: "Yes, that is the **Descent Stage**. To fly back home, they used that bottom half as a permanent launchpad. Because you have no wind or rain, that golden metal stage will sit on your surface forever.",
          },
        ],
      },
    ],
  },
  {
    id: 6,
    title: "Scene 6: The Final Goodbyes",
    subtitle: "Discarding the ascent and service stages on the journey home",
    timeline: "T+ 130:09:31",
    visualCue: "The Ascent Stage docks and is discarded; near Earth, the Service Module separates and burns up.",
    sections: [
      {
        id: "scene-6-ascent",
        timeline: "T+ 130:09:31",
        visualCue: "The Ascent Stage transfers the moon rocks and is released to crash into the Moon.",
        dialogue: [
          {
            speaker: "earth",
            text: "When the astronauts got back to the main ship in orbit, they moved all your moon rocks inside. Then, they threw away the empty **Ascent Stage**. It floated in your orbit for a while, but eventually, your gravity pulled it down. It crashed into your surface.",
          },
          {
            speaker: "moon",
            text: "And what about the main ship? How did they land safely on you?",
          },
        ],
      },
      {
        id: "scene-6-service",
        timeline: "T+ 194:49:12",
        visualCue: "15 minutes before atmospheric entry, the Service Module separates and disintegrates.",
        dialogue: [
          {
            speaker: "earth",
            text: "Just 15 minutes before they reached my atmosphere, they threw away the **Service Module**. It was torn apart and completely burned up in my sky. Only the tiny Command Module, protected by a heat shield, safely splashed into my ocean.",
          },
        ],
      },
    ],
  },
  {
    id: 7,
    title: "Scene 7: A Museum of Courage",
    subtitle: "The Moon becomes the keeper of humanity's greatest adventure",
    visualCue: "The camera pans out to show the whole Moon, zooming in slightly on the tiny glowing spot where the Descent Stage sits peacefully in the dark.",
    sections: [
      {
        id: "scene-7-main",
        visualCue: "The Moon shining peacefully in the dark, with the glowing spot of Tranquility Base.",
        dialogue: [
          {
            speaker: "moon",
            text: "So... the oceans, the Sun, and I... we are all holding pieces of this great journey?",
          },
          {
            speaker: "earth",
            text: "Exactly. My oceans hide the early rocket stages. The Sun holds the Third Stage. But you, Moon... you hold the most important monument of all. The Descent Stage and the crashed Ascent Stage.",
          },
          {
            speaker: "moon",
            emotion: "Smiling",
            text: "I guess I am not just empty rocks and dust anymore. I am a museum of human courage.",
          },
          {
            speaker: "earth",
            text: "Yes, Moon. You are the keeper of our greatest adventure.",
          },
        ],
      },
    ],
  },
];
