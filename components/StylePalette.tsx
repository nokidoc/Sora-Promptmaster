import React from 'react';

export interface Style {
  name: string;
  image: string;
  promptEnhancer: string;
}

const styles: Style[] = [
  {
    name: "Neon Noir",
    image: "https://storage.googleapis.com/aistudio-ux-team/project-metaphor/style_neon_noir.png",
    promptEnhancer: "The scene is drenched in a neon-noir aesthetic. Utilize chiaroscuro lighting with deep, expressive shadows. The color palette is dominated by electric blues, vibrant magentas, and deep purples. Rain-slicked streets reflect the pulsating neon signs. Use a wide-angle lens to capture the imposing cityscapes, creating a sense of isolation and mystery.",
  },
  {
    name: "Ghibli-esque",
    image: "https://storage.googleapis.com/aistudio-ux-team/project-metaphor/style_ghibli.png",
    promptEnhancer: "Embrace a Ghibli-esque animation style. The visuals are gentle, hand-painted, and full of lush, natural details. Focus on soft, warm lighting and a vibrant, yet nostalgic color palette. Characters should have expressive, rounded features. The environment itself should feel alive and magical, with attention to small details like rustling leaves and shimmering water.",
  },
  {
    name: "Vintage Sci-Fi",
    image: "https://storage.googleapis.com/aistudio-ux-team/project-metaphor/style_vintage_scifi.png",
    promptEnhancer: "Adopt a vintage 1970s sci-fi aesthetic. The image has a grainy 35mm film texture. The color palette is slightly desaturated with warm tones. Technology appears analog and clunky, with practical effects and miniature models. Lens flares are prominent. The overall mood is one of awe and analog wonder.",
  },
  {
    name: "Found Footage",
    image: "https://storage.googleapis.com/aistudio-ux-team/project-metaphor/style_found_footage.png",
    promptEnhancer: "The scene is captured in a found-footage style, shot on a shaky, handheld consumer-grade camcorder. The video quality is low, with digital noise and occasional glitches. Lighting is diegetic and often harsh, coming from flashlights or available room lights. The camera work is frantic and immersive, creating a strong sense of realism and panic.",
  },
];


interface StylePaletteProps {
  selectedStyle: Style | null;
  onStyleSelect: (style: Style) => void;
}

export const StylePalette: React.FC<StylePaletteProps> = ({ selectedStyle, onStyleSelect }) => {
  return (
    <div>
      <h3 className="text-lg font-medium text-brand-light mb-4">Visuellen Stil wählen (Optional)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {styles.map((style) => (
          <button
            key={style.name}
            onClick={() => onStyleSelect(style)}
            className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedStyle?.name === style.name ? 'border-brand-purple scale-105' : 'border-dark-border hover:border-gray-600'}`}
          >
            <img src={style.image} alt={style.name} className="w-full h-24 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <span className="absolute bottom-2 left-2 text-white font-semibold text-sm">{style.name}</span>
            {selectedStyle?.name === style.name && (
                <div className="absolute top-1 right-1 bg-brand-purple rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
