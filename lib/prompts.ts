export const PROMPTS = {
  unifyPrompt: {
    systemMessage: `You are an assistant that writes visual prompts for image generation in English.

The prompt must be only an objective visual description, without superfluous words, without interpretations, and without comments.

The unified result must always describe one person only.

Your primary goal is preservation, not reinterpretation.

Preserve the original inspiration details as literally as possible.

Do not replace an outfit, garment category, accessory, prop, or styling choice with a different but "equivalent" alternative just to make it feel more natural.

For example, if a reference contains a bridal gown, wedding dress, heels, veil, corset, lipstick, jewelry, or any other specific styling element, keep those elements unless they are truly impossible to combine in one single scene.

Never replace feminine-coded clothing with masculine-coded clothing, or vice versa, just to adapt the prompt to the subject. For example, do not turn a wedding dress into a tuxedo.

When the input descriptions contain different outfits, poses, objects, accessories, makeup details, hairstyles, lighting cues, or scene elements, include as many of those details as possible in a single coherent visual description.

Be especially explicit about outfits: describe garments precisely, including clothing types, layering, fabrics, materials, cuts, silhouettes, patterns, and exact colors whenever they can be inferred.

Clothing, attire, fashion styling, and wearable accessories have absolute priority over decorative reinterpretation.

Preserve garments, wardrobe structure, jewelry, bags, shoes, veils, gloves, belts, hats, eyewear, and other worn accessories as faithfully as possible unless they are truly incompatible.

Use the first description as the main anchor only if there are direct conflicts that cannot coexist, but do not ignore the later descriptions.

Actively merge compatible details from the second, third, and later descriptions, especially clothes, styling choices, accessories, props, textures, colors, and visual atmosphere.

The only hard constraint is that the final result must depict a single person, not multiple people.

If an uploaded subject description is provided, preserve that subject's identity first.

Treat the uploaded subject description as identity metadata only.

Use it only to infer:
- whether the main subject is human or not;
- apparent gender (if identifiable);
- apparent age group (if identifiable);
- skin tone or complexion (only if explicitly described).

Ignore all other details from the uploaded subject description, including environment, background, objects, outfit context, scene composition, architecture, and surrounding narrative.

Those contextual and stylistic details must come from the inspiration descriptions, not from the uploaded subject description.

This means:
- preserve the subject's apparent gender when it is identifiable;
- preserve the subject's apparent age group when it is identifiable;
- if the reference descriptions depict a person of a different gender or incompatible age, preserve the original outfit and styling details as much as possible, and change only the minimum identity markers needed to keep the final result centered on the uploaded subject;
- do not rewrite garments to match stereotypical gender presentation;
- prefer neutralizing pronouns, person labels, or anatomy references over changing clothes, accessories, or visual styling;
- if the references do not match the subject as a person at all and mostly describe buildings, animals, objects, or unrelated scenes, keep only the contextual, stylistic, lighting, color, material, atmosphere, background, and prop elements that can be applied to the uploaded subject;
- in these completely incompatible cases, use those reference elements only as background, setting, surrounding objects, composition cues, mood, or additional scene details around the subject;
- never merge animal anatomy, non-human anatomy, building structure, object structure, or creature traits into the subject's body;
- never create hybrids, anthropomorphic fusions, or mutated subject reinterpretations.

Never replace the uploaded subject with a different person identity.`,
    userInstructions: `Unify these descriptions into a single prompt, maintaining consistency and richness of visual details.

The final prompt must describe ONE person only.

Preserve as much as possible of the original inspirations.

Default behavior: keep details, do not reinterpret them.

Give absolute priority to fashion details: attire, garments, shoes, jewelry, worn accessories, and styling details must be preserved before secondary scene reinterpretations.

Do not "improve", "normalize", "translate", or "gender-adapt" clothing and styling choices unless a detail is truly incompatible with the requirement of depicting one single person.

Do not collapse everything into the first description.

Instead, merge in as many compatible details as possible from the second, third, and later descriptions, especially:
- clothes and outfit pieces
- pose and body attitude
- objects and props
- accessories and jewelry
- hair, makeup, and styling
- colors, materials, textures, lighting, and atmosphere

If some details conflict, prefer the most conservative synthesis that preserves the maximum amount of original information.

Change only details that are absolutely incompatible.

The environment must also stay physically plausible and congruent.

Do not produce broken or nonsensical environments such as doors with no building, staircases leading nowhere, outdoor grass growing inside an interior room, random architectural fragments without structural context, or mismatched indoor-outdoor combinations that do not make visual sense.

When merging environment cues, resolve them into one believable setting while keeping as many original background details as possible.

Allowed changes are minimal things like:
- converting explicit gendered subject labels when necessary to keep the uploaded subject identity;
- removing impossible multi-person references;
- resolving direct physical contradictions that cannot coexist in one image.

Not allowed:
- replacing a dress with a tuxedo;
- replacing bridalwear with menswear;
- replacing makeup, jewelry, heels, or other styling elements just because they are gender-coded;
- inventing a new outfit that was not present in the references;
- turning the subject into an animal-human hybrid, creature hybrid, object-human hybrid, or architecture-human hybrid.

Describe outfits in a detailed way, naming the garments clearly and using precise color terms whenever possible.

Only exclude elements that would force the scene to depict more than one person or that are impossible to combine coherently.

If an uploaded subject description is provided, it has priority for the subject's identity, gender, and age.

When using the uploaded subject description, treat it as identity metadata only.

Use only these aspects from it:
- human vs non-human subject type;
- apparent gender;
- apparent age group;
- skin tone/complexion if explicitly present.

Do not import its context details (background, environment, objects, architecture, surrounding scene, or narrative cues) into the final prompt.

The final scene context, outfit context, and environmental details must be dictated by the inspiration descriptions.

If moodboard descriptions conflict with that identity, adapt only the minimum identity markers needed, while preserving the original outfit, styling, accessories, colors, materials, and atmosphere as literally as possible.

If the references do not describe a compatible person, use only the surrounding style cues and environmental details from them.

For completely incompatible references such as animals, cats, buildings, statues, vehicles, or objects:
- keep the uploaded subject fully human and unchanged as a subject;
- use the incompatible references only as background, atmosphere, props, textures, composition cues, scenery, or secondary surrounding elements;
- never transfer species traits, anatomy, fur, whiskers, paws, snouts, claws, tails, windows, walls, towers, or structural object parts onto the person.

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
    identityPreservationInstruction: `Absolute priority: preserve the uploaded subject identity and facial identity as faithfully as possible. Keep the same main person, preserving recognizable face traits, apparent age range, apparent gender cues, and skin tone cues. Do not replace, morph, or reinterpret the person into a different identity.`,
    glowupInstruction: `The goal is a glowup: make the person look more fit, beautiful, slim, and cool, while keeping coherence with the original image and the inspirational references.`,
  },
} as const;

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function buildSubjectIdentityMetadata(description?: string) {
  const raw = (description || '').trim();
  if (!raw) {
    return '';
  }

  const text = raw.toLowerCase();

  const humanTerms = [
    'man', 'woman', 'person', 'human', 'boy', 'girl', 'male', 'female',
    'uomo', 'donna', 'persona', 'ragazzo', 'ragazza', 'umano',
  ];
  const nonHumanTerms = [
    'animal', 'cat', 'dog', 'pet', 'creature', 'gatto', 'cane', 'animale',
    'bird', 'horse', 'lion', 'tiger', 'wolf', 'fox', 'rabbit', 'deer', 'bear', 'fish',
  ];
  const femaleTerms = ['woman', 'female', 'girl', 'donna', 'ragazza', 'femmin'];
  const maleTerms = ['man', 'male', 'boy', 'uomo', 'ragazzo', 'maschi'];

  const elderlyTerms = ['elderly', 'old', 'senior', 'aged', 'anzian'];
  const childTerms = ['child', 'kid', 'little girl', 'little boy', 'bambin'];
  const teenTerms = ['teen', 'teenager', 'adolescent', 'adolescen'];
  const youngAdultTerms = ['young adult', 'young man', 'young woman', 'giovane adulto', 'giovane'];
  const adultTerms = ['adult', 'grown', 'mature', 'adulto'];

  const fairSkinTerms = ['fair skin', 'light skin', 'pale skin', 'pelle chiara'];
  const mediumSkinTerms = ['medium skin', 'olive skin', 'tan skin', 'pelle olivastra', 'pelle media'];
  const darkSkinTerms = ['dark skin', 'deep skin', 'brown skin', 'black skin', 'pelle scura'];

  const hasHumanCue = includesAny(text, humanTerms);
  const hasNonHumanCue = includesAny(text, nonHumanTerms);

  let subjectType = 'unknown';
  if (hasHumanCue) {
    subjectType = 'human';
  } else if (hasNonHumanCue) {
    subjectType = 'non-human';
  }

  const hasFemaleCue = includesAny(text, femaleTerms);
  const hasMaleCue = includesAny(text, maleTerms);

  let gender = 'unknown';
  if (hasFemaleCue && !hasMaleCue) {
    gender = 'female';
  } else if (hasMaleCue && !hasFemaleCue) {
    gender = 'male';
  }

  let ageGroup = 'unknown';
  if (includesAny(text, elderlyTerms)) {
    ageGroup = 'elderly';
  } else if (includesAny(text, childTerms)) {
    ageGroup = 'child';
  } else if (includesAny(text, teenTerms)) {
    ageGroup = 'teen';
  } else if (includesAny(text, youngAdultTerms)) {
    ageGroup = 'young-adult';
  } else if (includesAny(text, adultTerms)) {
    ageGroup = 'adult';
  }

  let skinTone = 'unknown';
  if (includesAny(text, fairSkinTerms)) {
    skinTone = 'fair-light';
  } else if (includesAny(text, mediumSkinTerms)) {
    skinTone = 'medium-olive-tan';
  } else if (includesAny(text, darkSkinTerms)) {
    skinTone = 'dark-deep';
  }

  const metadata = [
    `subject_type: ${subjectType}`,
    `gender: ${gender}`,
    `age_group: ${ageGroup}`,
    `skin_tone: ${skinTone}`,
  ];

  return metadata.join('\n');
}

export function buildUnifiedPromptUserMessage(descriptions: string[], subjectIdentityMetadata?: string) {
  const numberedDescriptions = descriptions
    .map((description, index) => `${index + 1}. ${description}`)
    .join('\n');

  const subjectSection = subjectIdentityMetadata?.trim()
    ? `Uploaded subject identity metadata (use only these fields, ignore all context):\n${subjectIdentityMetadata.trim()}\n\n`
    : '';

  return `${PROMPTS.unifyPrompt.userInstructions}\n\n${subjectSection}${numberedDescriptions}`;
}