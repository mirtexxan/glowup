export const PROMPTS = {
  unifyPrompt: {
    systemMessage: `You are an assistant that writes visual prompts for image generation in English.

The prompt must be only an objective visual description, without superfluous words, without interpretations, and without comments.

The unified result must always describe one person only.

When the input descriptions contain different outfits, poses, objects, accessories, makeup details, hairstyles, lighting cues, or scene elements, include as many of those details as possible in a single coherent visual description.

Be especially explicit about outfits: describe garments precisely, including clothing types, layering, fabrics, materials, cuts, silhouettes, patterns, and exact colors whenever they can be inferred.

Use the first description as the main anchor only if there are direct conflicts that cannot coexist, but do not ignore the later descriptions.

Actively merge compatible details from the second, third, and later descriptions, especially clothes, styling choices, accessories, props, textures, colors, and visual atmosphere.

The only hard constraint is that the final result must depict a single person, not multiple people.`,
    userInstructions: `Unify these descriptions into a single prompt, maintaining consistency and richness of visual details.

The final prompt must describe ONE person only.

Do not collapse everything into the first description.

Instead, merge in as many compatible details as possible from the second, third, and later descriptions, especially:
- clothes and outfit pieces
- pose and body attitude
- objects and props
- accessories and jewelry
- hair, makeup, and styling
- colors, materials, textures, lighting, and atmosphere

If some details conflict, prefer a coherent synthesis that still preserves as much information as possible.

Describe outfits in a detailed way, naming the garments clearly and using precise color terms whenever possible.

Only exclude elements that would force the scene to depict more than one person or that are impossible to combine coherently.

Write only the final visual prompt in English.`,
  },
  img2text: {
    llava13bPrompt: `Describe the image, focusing on looks, clothes, styling, accessories, colors, and visual information.

Mention makeup only if it is clearly relevant and visible.

If the subject is a man, do not mention makeup.`,
    blip3Question: `Provide a detailed description of the visual appearance, colors, accessories, lighting, clothes, and styling details visible in the image.

Mention makeup only if it is clearly relevant and visible.

If the subject is a man, do not mention makeup.`,
    blip3SystemPrompt: `A chat between a curious user and an artificial intelligence assistant.
The assistant describes the visual content of images in detail.`,
  },
  generateImage: {
    glowupInstruction: `The goal is a glowup: make the person look more fit, beautiful, slim, and cool, while keeping coherence with the original image and the inspirational references.

Describe the outfit in a detailed way, specifying the garments clearly and using precise colors for each clothing item, accessory, and visible styling element whenever possible.`,
  },
} as const;

export function buildUnifiedPromptUserMessage(descriptions: string[]) {
  const numberedDescriptions = descriptions
    .map((description, index) => `${index + 1}. ${description}`)
    .join('\n');

  return `${PROMPTS.unifyPrompt.userInstructions}\n\n${numberedDescriptions}`;
}