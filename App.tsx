import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

import { useVideoProcessor } from './hooks/useVideoProcessor';
import { FileUpload, UploadIcon, ImageIcon } from './components/FileUpload';
import { PromptDisplay } from './components/PromptDisplay';
import { Spinner } from './components/Spinner';
import { VideoPlayer } from './components/VideoPlayer';
import { Frame } from './types';

interface Cameo {
  id: number;
  name: string;
  character: string;
}

type Workflow = 'video' | 'text';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Fehler beim Konvertieren der Datei zu Base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });


const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [identifierImage, setIdentifierImage] = useState<File | null>(null);
  const [userPromptIdea, setUserPromptIdea] = useState<string>('');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [visualCorePrompt, setVisualCorePrompt] = useState<string | null>(null);
  const [narrativeActionPrompt, setNarrativeActionPrompt] = useState<string | null>(null);
  const [germanVoiceoverScript, setGermanVoiceoverScript] = useState<string | null>(null);
  const [imageAnalysisDescription, setImageAnalysisDescription] = useState<string | null>(null);
  const [finalEnglishPrompt, setFinalEnglishPrompt] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [finalPromptTarget, setFinalPromptTarget] = useState<'sora' | 'veo' | null>(null);
  const [cameos, setCameos] = useState<Cameo[]>([]);
  const [detectedCharacters, setDetectedCharacters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const { extractFrames } = useVideoProcessor();

  const totalSteps = identifierImage ? 4 : 3;

  const resetState = () => {
    setCurrentStep(1);
    setWorkflow(null);
    setVideoFile(null);
    setIdentifierImage(null);
    setUserPromptIdea('');
    setFrames([]);
    setTranscription(null);
    setVisualCorePrompt(null);
    setNarrativeActionPrompt(null);
    setGermanVoiceoverScript(null);
    setImageAnalysisDescription(null);
    setFinalEnglishPrompt(null);
    setPreviewImageUrl(null);
    setFinalPromptTarget(null);
    setCameos([]);
    setDetectedCharacters([]);
    setError(null);
    setIsLoading(false);
    setProgressMessage('');
  };

  const handleFileChange = (file: File) => {
    setVideoFile(file);
  };

  const handleImageChange = (file: File) => {
    setIdentifierImage(file);
  };

  const addCameo = () => {
    if (cameos.length < 3) {
      setCameos([...cameos, { id: Date.now(), name: '', character: '' }]);
    }
  };
  
  const updateCameo = (id: number, field: 'name' | 'character', value: string) => {
    setCameos(cameos.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  
  const removeCameo = (id: number) => {
    setCameos(cameos.filter(c => c.id !== id));
  };

  const handleProceed = () => {
    if (videoFile) {
      setWorkflow('video');
    } else if (userPromptIdea.trim()) {
      setWorkflow('text');
    }

    if (identifierImage) {
      analyzeImage();
    } else {
      proceedToDetails();
    }
  };

  const analyzeImage = async () => {
    if (!identifierImage) return;
    setIsLoading(true);
    setProgressMessage('Analysiere Bild...');
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const imageBase64 = await fileToBase64(identifierImage);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { text: "Analysiere dieses Bild. Beschreibe auf Deutsch detailliert alle sichtbaren Objekte, Charaktere, die Umgebung, den Stil und die Atmosphäre. Sei besonders präzise bei der Beschreibung von Produkten oder spezifischen Gegenständen." },
            { inlineData: { mimeType: identifierImage.type, data: imageBase64 } },
          ],
        },
      });
      setImageAnalysisDescription(response.text);
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Während der Bildanalyse ist ein unbekannter Fehler aufgetreten.');
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  };
  
  const proceedToDetails = () => {
    const detailsStep = identifierImage ? 3 : 2;
    if (workflow === 'video') {
      analyzeVideo(detailsStep);
    } else {
      setCurrentStep(detailsStep);
    }
  };

  const analyzeVideo = useCallback(async (nextStep: number) => {
    if (!videoFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      // Step 1: Transcribe Audio
      setProgressMessage('Schritt 1/4: Audio wird transkribiert...');
      const videoBase64 = await fileToBase64(videoFile);
      const transcriptionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [
          {text: "Transkribiere den gesprochenen Text und wichtige Geräusche (z.B. 'Hund bellt', 'Musik spielt') in diesem Video. Gib nur die Transkription auf Deutsch aus. Wenn kein Ton vorhanden ist, gib 'Kein Ton erkannt.' aus."},
          {inlineData: {
              mimeType: videoFile.type,
              data: videoBase64,
          }},
        ]},
      });
      const transcribedText = transcriptionResponse.text;
      if (transcribedText && transcribedText !== 'Kein Ton erkannt.') {
        setTranscription(transcribedText);
      }
      
      // Step 2: Extract frames
      setProgressMessage('Schritt 2/4: Frames werden extrahiert und analysiert...');
      const extractedFrames = await extractFrames(videoFile);
      if (extractedFrames.length === 0) {
        throw new Error("Es konnten keine Frames aus dem Video extrahiert werden.");
      }
      setFrames(extractedFrames.map(f => ({...f, description: 'ausstehend'})));

      // Step 3: Analyze each frame and generate GERMAN prompts
      const frameDescriptions: string[] = [];
      for (let i = 0; i < extractedFrames.length; i++) {
        const frame = extractedFrames[i];
        setProgressMessage(`Schritt 2/4: Analysiere Frame ${i + 1}/${extractedFrames.length}...`);
        const frameAnalysisPrompt = `Analysiere dieses Bild (bei Sekunde ${frame.timestamp.toFixed(1)}) im Kontext der folgenden deutschen Gesamttranskription: "${transcribedText || 'Kein Ton'}". Beschreibe auf Deutsch detailliert die Szene, Handlung und die korrelierenden Geräusche/Worte.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [
              {text: frameAnalysisPrompt},
              {inlineData: { mimeType: 'image/jpeg', data: frame.base64 }},
            ]},
        });
        const description = response.text;
        frameDescriptions.push(`Zeitstempel ${frame.timestamp.toFixed(1)}s: ${description}`);
        setFrames(prev => prev.map((f, index) => index === i ? {...f, description} : f));
      }

      // Step 4: Detect Characters
      setProgressMessage('Schritt 3/4: Charaktere werden identifiziert...');
      const characterDetectionPrompt = `Du bist ein erfahrener Film-Continuity-Supervisor. Analysiere die folgenden Frame-Beschreibungen und die Transkription, um alle einzigartigen Charaktere in der Szene zu identifizieren. Gib für jeden Charakter eine kurze, eindeutige Beschreibung (z.B. "Mann im blauen Hemd", "Frau mit Brille"). Gib das Ergebnis als JSON-Objekt mit einem "characters"-Array zurück. Wenn keine Charaktere erkennbar sind, gib ein leeres Array zurück.

      Transkription: "${transcribedText || 'Kein Ton'}"

      Frame-Analysen:
      ${frameDescriptions.join('\n')}`;

      const charactersResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: characterDetectionPrompt,
          config: {
              responseMimeType: 'application/json',
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      characters: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                      }
                  }
              }
          }
      });
      
      const characterResult = JSON.parse(charactersResponse.text);
      if (characterResult.characters && characterResult.characters.length > 0) {
          setDetectedCharacters(characterResult.characters);
      }

      setProgressMessage('Schritt 4/4: Deutsche Prompt-Entwürfe werden erstellt...');
      const directorPrompt = `Du bist ein professioneller KI-Regisseur und Drehbuchautor. Basierend auf der folgenden Frame-für-Frame-Analyse und der Gesamttranskription ("${transcribedText || 'Kein Ton'}"), zerlege die Szene in ihre Kernkomponenten und erstelle auf DEUTSCH:
1. Einen "visualCorePrompt": Beschreibe HIER NUR die visuellen und filmischen Elemente. Das beinhaltet den Kamerastil, die Beleuchtung, die Farbpalette, die Textur (z.B. "körniger Filmlook") und die statische Umgebung. Beschreibe KEINE Handlungen von Charakteren. Beispiel: "Gedreht auf 35-mm-Film, eine regennasse, enge Gasse bei Nacht. Das einzige Licht kommt von pulsierenden Neonschildern, die tiefe Schatten werfen und die nassen Pflastersteine in Blau- und Magentatönen spiegeln. Die Kamera befindet sich auf einem niedrigen Winkel."
2. Einen "narrativeActionPrompt": Beschreibe HIER NUR die Aktionen, Bewegungen und Interaktionen der Charaktere innerhalb der Szene. Beispiel: "Ein Mann in einem langen Mantel rennt hastig durch die Gasse, blickt sich immer wieder über die Schulter. Er hält eine Aktentasche fest an sich gedrückt."
3. Ein passendes "voiceoverScript", das den Dialog oder die Erzählstimme enthält.

Analysen:
${frameDescriptions.join('\n')}`;
      const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: directorPrompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    visualCorePrompt: { type: Type.STRING, description: "Der rein visuelle Kern-Prompt: Stil, Szene, Kamera, Licht, OHNE Charakter-Aktionen." },
                    narrativeActionPrompt: { type: Type.STRING, description: "Der Handlungs-Prompt: Nur die Aktionen und Bewegungen der Charaktere." },
                    voiceoverScript: { type: Type.STRING, description: "Das generierte Voiceover-Skript auf Deutsch." }
                }
            }
        }
      });
      
      const resultJson = JSON.parse(finalResponse.text);
      setVisualCorePrompt(resultJson.visualCorePrompt);
      setNarrativeActionPrompt(resultJson.narrativeActionPrompt);
      setGermanVoiceoverScript(resultJson.voiceoverScript);
      setCurrentStep(nextStep);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Während der Analyse ist ein unbekannter Fehler aufgetreten.');
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  }, [videoFile, extractFrames]);

  const generateFinalPrompt = useCallback(async (target: 'sora' | 'veo') => {
    setIsLoading(true);
    setError(null);
    setFinalPromptTarget(target);
    const finalStep = totalSteps;
    setProgressMessage(`Finaler englischer Prompt für ${target === 'sora' ? 'Sora 2' : 'Veo'} wird erstellt...`);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        let identifierImageBase64: string | null = null;
        if (identifierImage) {
            identifierImageBase64 = await fileToBase64(identifierImage);
        }

        const validCameos = cameos.filter(c => c.name && c.character);
        let cameoInstruction: string;

        if (validCameos.length > 0) {
            const baseInstruction = `The user has specified ${validCameos.length} cameo(s). This is the highest priority instruction. For each character you generate that matches one of the following descriptions, you MUST use the provided name instead of the description.`;
            
            if (target === 'sora') {
                const soraInstructions = validCameos.map(c => 
                    `- If a character matches the description "${c.character}", you MUST name them "@${c.name}". The "@" symbol is critical. Example: Instead of writing "a woman with red hair walks by", you must write "@${c.name} walks by".`
                ).join('\n');
                cameoInstruction = `${baseInstruction}\n${soraInstructions}\nDescribe any other characters normally.`;
            } else { // Veo
                const veoInstructions = validCameos.map(c => 
                    `- If a character matches the description "${c.character}", you MUST name them "${c.name}". Example: Instead of writing "a woman with red hair walks by", you must write "${c.name} walks by".`
                ).join('\n');
                cameoInstruction = `${baseInstruction}\n${veoInstructions}\nDescribe any other characters normally.`;
            }
        } else {
            if (workflow === 'video') {
                 cameoInstruction = `The user has NOT specified any cameo names. Simply describe all characters based on the video analysis (e.g., "a man in a red jacket", "the woman with glasses"). Do NOT invent names or use placeholders.`;
            } else { // text workflow
                 cameoInstruction = `The user has NOT specified any cameo names. Describe any characters you invent using descriptive terms (e.g., "a man in a red jacket", "the woman with glasses"). Do NOT invent proper names or use placeholders.`;
            }
        }
        
        let finalPromptGenerator = '';
        
        const imageInstruction = identifierImage ? `2. **Incorporate the Confirmed Image Analysis:** The user has provided an identifier image and has reviewed and confirmed the following detailed description of it. This description is the **absolute source of truth** for the image's content. You MUST prioritize this text over your own interpretation of the image file. Weave the details from this description into your final prompt where appropriate (e.g., character appearance, object details, style). \n\n **Confirmed Analysis:** "${imageAnalysisDescription}"` 
            : `2. **Describe Visuals from Analysis:** Describe all visual elements based on the source material analysis.`;
        
        const textImageInstruction = identifierImage ? `2. **Incorporate the Confirmed Image Analysis:** The user has provided an identifier image and has reviewed and confirmed the following detailed description of it. This description is the **absolute source of truth** for the image's content. You MUST prioritize this text over your own interpretation of the image file. Weave the details from this description into your final prompt where appropriate (e.g., character appearance, object details, style). \n\n **Confirmed Analysis:** "${imageAnalysisDescription}"` 
            : `2. **Invent the Visuals:** Creatively invent all visual details based on the user's idea.`;

        if (workflow === 'video') {
           finalPromptGenerator = `You are a world-class prompt engineer and screenwriter, specializing in ${target === 'sora' ? "OpenAI's Sora 2" : "Google's Veo 3.1"} model. Your task is to transform a scene analysis into a vivid, production-ready prompt that functions as a micro-script.

            **Primary Goal:** Create a single, cohesive, narrative paragraph in English that is incredibly detailed, evokes a specific mood, and provides clear directorial cues for the AI, which acts as a "world simulator".

            **Source Material:**
            1.  **Original German Dialogue/Transcription:** "${transcription || 'Kein Ton'}"
            2.  **Visual Core (Style, Camera, Scene in German):** "${visualCorePrompt}"
            3.  **Narrative Action (What happens, in German):** "${narrativeActionPrompt}"
            4.  **User's Core Idea (in German):** "${userPromptIdea || 'Keine spezifische Idee vom Nutzer.'}"

            **Critical Instructions for Prompt Construction:**

            1.  **Synthesize, Don't Just List:** Your primary task is to seamlessly WEAVE the 'Visual Core', 'Narrative Action', AND the 'User's Core Idea' into a single, cohesive, narrative paragraph in English. The user's idea provides the main creative direction.

            ${imageInstruction}
            
            3.  **Start with Style:** Begin the prompt with a powerful declaration of the visual style and quality based on the Visual Core analysis. Examples: "A hyper-realistic, cinematic 8K video...", "Shot on 35mm film, the scene has a rich, grainy texture...".

            4.  **Build the World with Sensory Detail:** Translate the German scene description into a deeply immersive English narrative. Describe the environment with extreme detail. Focus on atmosphere, setting, and sensory details (e.g., 'the smell of damp earth', 'the texture of rough brick').

            5.  **Direct the Camera with Intent:** Don't just state the shot; describe its purpose and feel. Integrate it into the action. Example: "An extreme, claustrophobic close-up on the character's eyes reveals their panic, droplets of sweat beading on their brow." Specify shot types (e.g., epic wide establishing shot, intimate dolly zoom) and lens characteristics.

            6.  **Master the Lighting and Color:** Describe lighting with artistic intent to shape the mood. Examples: "Harsh, dramatic chiaroscuro lighting carves out the character's features," or "A vibrant, pulsating neon glow washes over the futuristic city street, with a color palette of electric blues and magenta."

            7.  **Handle Cameos (Absolute Priority):**
                ${cameoInstruction}

            8.  **Preserve German Dialogue:** The original German dialogue MUST be preserved, enclosed in quotation marks. For example: "...the man leans forward and says, "Das ist unglaublich." before turning away."

            9.  **Final Output Requirement:** The result must be a SINGLE, flowing paragraph of English text. Do NOT include titles or labels.`;
        } else { // workflow === 'text'
            finalPromptGenerator = `You are a world-class prompt engineer and screenwriter, specializing in ${target === 'sora' ? "OpenAI's Sora 2" : "Google's Veo 3.1"} model. Your task is to transform a user's simple idea into a vivid, production-ready prompt.

            **Primary Goal:** Take the user's core idea and expand it into a single, cohesive, narrative paragraph in English. This paragraph must be incredibly detailed, evoking a specific mood, and providing clear directorial cues for the AI. You must invent all the necessary cinematic details.

            **Source Material:**
            1.  **User's Core Idea (in German):** "${userPromptIdea}"

            **Critical Instructions for Prompt Construction:**

            1.  **Expand, Don't Just Translate:** Your primary task is to take the user's simple idea and build a rich narrative world around it. Translate the German idea into English and then creatively expand upon it.
            
            ${textImageInstruction}

            3.  **Start with Style:** Begin the prompt with a powerful declaration of the visual style that fits the user's idea. Invent a fitting style. Examples: "A hyper-realistic, cinematic 8K video...", "Shot on 35mm film, the scene has a rich, grainy texture...".

            4.  **Build the World with Sensory Detail:** Describe an immersive environment based on the idea. Focus on atmosphere, setting, and sensory details (e.g., 'the smell of damp earth', 'the texture of rough brick').

            5.  **Direct the Camera with Intent:** Don't just state the shot; describe its purpose and feel. Integrate it into the action. Example: "An extreme, claustrophobic close-up on the character's eyes reveals their panic, droplets of sweat beading on their brow." Specify shot types and lens characteristics.

            6.  **Master the Lighting and Color:** Describe lighting with artistic intent to shape the mood. Examples: "Harsh, dramatic chiaroscuro lighting carves out the character's features," or "A vibrant, pulsating neon glow washes over the futuristic city street, with a color palette of electric blues and magenta."

            7.  **Handle Cameos (Absolute Priority):**
                ${cameoInstruction}

            8.  **Final Output Requirement:** The result must be a SINGLE, flowing paragraph of English text. Do NOT include titles or labels.`;
        }
        
        const contentParts: ({text: string} | {inlineData: {mimeType: string, data: string}})[] = [{ text: finalPromptGenerator }];

        if (identifierImageBase64 && identifierImage) {
            contentParts.push({
                inlineData: {
                    mimeType: identifierImage.type,
                    data: identifierImageBase64,
                },
            });
        }

        const textResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: contentParts },
        });

        const generatedPrompt = textResponse.text;
        setFinalEnglishPrompt(generatedPrompt);

        // Generate preview image
        setProgressMessage('Visuelles Konzept wird erstellt...');
        try {
            // A more direct prompt for Imagen, focusing on quality and style.
            const imageGenPrompt = `A visually stunning, cinematic, high-resolution, photorealistic image. ${generatedPrompt}. Highly detailed, best possible quality. NO text, subtitles, watermarks, or text overlays.`;

            const imageGenResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: imageGenPrompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: '16:9',
                },
            });
            
            if (imageGenResponse.generatedImages && imageGenResponse.generatedImages.length > 0) {
                const base64ImageBytes: string = imageGenResponse.generatedImages[0].image.imageBytes;
                const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
                setPreviewImageUrl(imageUrl);
            } else {
                 throw new Error("Imagen model did not return an image.");
            }
        } catch (imgErr) {
            console.error("Fehler beim Erstellen des Vorschau-Bildes:", imgErr);
            // Non-critical error, the prompt is the main product. The user will be notified in the UI.
        }

        setCurrentStep(finalStep);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : `Fehler beim Erstellen des ${target}-Prompts.`);
    } finally {
        setIsLoading(false);
        setProgressMessage('');
    }
  }, [workflow, visualCorePrompt, narrativeActionPrompt, transcription, cameos, userPromptIdea, identifierImage, imageAnalysisDescription, totalSteps]);

  const isCameoIncomplete = cameos.some(c => (c.name && !c.character) || (!c.name && c.character));

  const videoSrc = videoFile ? URL.createObjectURL(videoFile) : null;
  const imageSrc = identifierImage ? URL.createObjectURL(identifierImage) : null;

  const isProceedDisabled = !videoFile && !userPromptIdea.trim();
  
  const detailsStepNumber = identifierImage ? 3 : 2;
  const finalStepNumber = identifierImage ? 4 : 3;

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">Prompt Master Creator</h1>
          <p className="mt-4 text-lg text-dark-text-secondary">Von der Idee zum produktionsfertigen Prompt in {totalSteps} Schritten.</p>
        </header>

        {/* Step Indicator */}
        <div className="w-full max-w-4xl mx-auto mb-12">
          <ol className="flex items-center w-full">
            <li className={`flex w-full items-center ${currentStep >= 1 ? 'text-brand-purple' : 'text-gray-500'} after:content-[''] after:w-full after:h-1 after:border-b ${currentStep > 1 ? 'after:border-brand-purple' : 'after:border-gray-700'} after:border-4 after:inline-block`}>
              <span className={`flex items-center justify-center w-10 h-10 ${currentStep >= 1 ? 'bg-brand-light' : 'bg-gray-700'} rounded-full lg:h-12 lg:w-12 shrink-0`}>
                <span className="font-bold text-lg">{currentStep > 1 ? '✓' : '1'}</span>
              </span>
            </li>
            
            {identifierImage && (
              <li className={`flex w-full items-center ${currentStep >= 2 ? 'text-brand-purple' : 'text-gray-500'} after:content-[''] after:w-full after:h-1 after:border-b ${currentStep > 2 ? 'after:border-brand-purple' : 'after:border-gray-700'} after:border-4 after:inline-block`}>
                <span className={`flex items-center justify-center w-10 h-10 ${currentStep >= 2 ? 'bg-brand-light' : 'bg-gray-700'} rounded-full lg:h-12 lg:w-12 shrink-0`}>
                  <span className="font-bold text-lg">{currentStep > 2 ? '✓' : '2'}</span>
                </span>
              </li>
            )}

            <li className={`flex w-full items-center ${currentStep >= detailsStepNumber ? 'text-brand-purple' : 'text-gray-500'} ${totalSteps > detailsStepNumber ? `after:content-[''] after:w-full after:h-1 after:border-b ${currentStep > detailsStepNumber ? 'after:border-brand-purple' : 'after:border-gray-700'} after:border-4 after:inline-block` : ''}`}>
              <span className={`flex items-center justify-center w-10 h-10 ${currentStep >= detailsStepNumber ? 'bg-brand-light' : 'bg-gray-700'} rounded-full lg:h-12 lg:w-12 shrink-0`}>
                <span className="font-bold text-lg">{currentStep > detailsStepNumber ? '✓' : detailsStepNumber}</span>
              </span>
            </li>
            
            <li className={`flex items-center ${currentStep === finalStepNumber ? 'text-brand-purple' : 'text-gray-500'}`}>
              <span className={`flex items-center justify-center w-10 h-10 ${currentStep === finalStepNumber ? 'bg-brand-light' : 'bg-gray-700'} rounded-full lg:h-12 lg:w-12 shrink-0`}>
                <span className="font-bold text-lg">{finalStepNumber}</span>
              </span>
            </li>
          </ol>
        </div>

        <main className="bg-dark-card rounded-lg border border-dark-border p-6 sm:p-10 flex-grow flex flex-col justify-center">
          {isLoading ? (
              <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                <Spinner large={true} />
                <p className="mt-6 text-xl font-medium text-dark-text-secondary">{progressMessage}</p>
              </div>
          ) : error ? (
             <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Fehler: </strong>
                <span className="block sm:inline">{error}</span>
                <button onClick={resetState} className="ml-4 bg-red-700 px-2 py-1 rounded">Nochmal versuchen</button>
              </div>
          ) : (
            <>
            {currentStep === 1 && (
              <div>
                <h2 className="text-3xl font-semibold text-white mb-6 text-center">Schritt 1: Beschreibe deine Idee</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <FileUpload
                        id="video-upload"
                        onFileChange={handleFileChange}
                        disabled={isLoading}
                        acceptedFileTypes="video/*"
                        label="Video zum Analysieren auswählen"
                        description="Optional, wenn Idee vorhanden"
                        Icon={UploadIcon}
                    />

                    <FileUpload
                        id="image-upload"
                        onFileChange={handleImageChange}
                        disabled={isLoading}
                        acceptedFileTypes="image/*"
                        label="Identifikator-Bild hochladen"
                        description="Optional: für Charakter, Stil, etc."
                        Icon={ImageIcon}
                    />
                    
                    {imageSrc && (
                        <div className="pl-2">
                          <h3 className="text-lg font-semibold text-white mb-2">Bild-Vorschau</h3>
                          <img src={imageSrc} alt="Identifier Preview" className="rounded-lg max-h-48 border border-dark-border" />
                        </div>
                    )}
                    
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                        <label htmlFor="prompt-idea" className="block mb-2 text-lg font-medium text-brand-light">Deine Prompt-Idee</label>
                        <textarea
                          id="prompt-idea"
                          rows={4}
                          className="block p-2.5 w-full text-base text-dark-text bg-dark-bg rounded-lg border border-dark-border focus:ring-brand-purple focus:border-brand-purple"
                          placeholder="z.B. 'Ein Astronaut reitet auf einem galaktischen Wal durch den Kosmos.'"
                          value={userPromptIdea}
                          onChange={(e) => setUserPromptIdea(e.target.value)}
                          disabled={isLoading}
                        ></textarea>
                      </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-dark-border">
                    <h3 className="text-lg font-medium text-brand-light mb-2">Cameo-Zuweisung (Optional)</h3>
                    <p className="text-sm text-dark-text-secondary mb-4">Weise Charakteren feste Namen zu (max. 3).</p>
                    <div className="space-y-4">
                      {cameos.map((cameo, index) => (
                        <div key={cameo.id} className="grid grid-cols-1 sm:grid-cols-[1fr,1.5fr,auto] gap-3 items-center">
                          <input 
                              type="text" 
                              value={cameo.name}
                              onChange={(e) => updateCameo(cameo.id, 'name', e.target.value)}
                              placeholder={`Cameo ${index + 1} Name`}
                              className="bg-dark-bg border border-dark-border text-dark-text text-sm rounded-lg focus:ring-brand-purple focus:border-brand-purple block w-full p-2.5"
                          />
                          <input
                              type="text"
                              value={cameo.character}
                              onChange={(e) => updateCameo(cameo.id, 'character', e.target.value)}
                              placeholder="Beschreibung (z.B. 'Astronaut')"
                              className="bg-dark-bg border border-dark-border text-dark-text text-sm rounded-lg focus:ring-brand-purple focus:border-brand-purple block w-full p-2.5"
                          />
                          <button onClick={() => removeCameo(cameo.id)} className="text-red-500 hover:text-red-400 text-sm font-semibold justify-self-start">
                            Entfernen
                          </button>
                        </div>
                      ))}
                      {cameos.length < 3 && (
                        <button onClick={addCameo} className="mt-2 text-brand-light hover:text-white transition-colors font-semibold text-sm">+ Cameo hinzufügen</button>
                      )}
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-dark-border">
                    <button
                        onClick={handleProceed}
                        disabled={isProceedDisabled || isLoading}
                        className="w-full bg-brand-purple hover:bg-violet-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center text-lg"
                    >
                        {videoFile ? 'Video analysieren & Fortfahren' : 'Idee umwandeln & Fortfahren'}
                    </button>
                </div>
              </div>
            )}
            
            {currentStep === 2 && identifierImage && (
                <div>
                    <h2 className="text-3xl font-semibold text-white mb-6 text-center">Schritt 2: Bildanalyse bestätigen</h2>
                    <p className="text-center text-dark-text-secondary mb-8">Die KI hat Ihr Bild analysiert. Überprüfen und bearbeiten Sie die Beschreibung, um sicherzustellen, dass sie korrekt ist, bevor Sie fortfahren.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="flex flex-col items-center">
                            <h3 className="text-xl font-semibold text-white mb-4">Ihr Bild</h3>
                            <img src={imageSrc!} alt="Identifier" className="rounded-lg border border-dark-border max-h-[500px] w-auto"/>
                        </div>
                        <div>
                        {imageAnalysisDescription && (
                            <PromptDisplay
                                title="KI-generierte Bildbeschreibung"
                                text={imageAnalysisDescription}
                                onTextChange={setImageAnalysisDescription}
                                editable={true}
                            />
                        )}
                        </div>
                    </div>
                    <div className="mt-10 pt-8 border-t border-dark-border">
                      <div className="flex justify-between items-center">
                         <button onClick={() => setCurrentStep(1)} className="text-gray-400 hover:text-white transition-colors">Zurück</button>
                         <button
                            onClick={proceedToDetails}
                            className="bg-brand-purple hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                         >
                           Analyse bestätigen & Fortfahren
                         </button>
                      </div>
                    </div>
                </div>
            )}

            {currentStep === detailsStepNumber && (
              <div>
                {workflow === 'video' ? (
                  <>
                    <h2 className="text-3xl font-semibold text-white mb-6">Schritt {detailsStepNumber}: Analysieren & Bearbeiten</h2>
                    <div className="space-y-8">
                      {transcription && <PromptDisplay title="Original-Transkription (Audio)" text={transcription} onTextChange={()=>{}} editable={false} />}
                      {visualCorePrompt && <PromptDisplay title="Visueller Kern-Prompt (Stil, Szene, Kamera)" text={visualCorePrompt} onTextChange={setVisualCorePrompt} />}
                      {narrativeActionPrompt && <PromptDisplay title="Handlungs-Prompt (Was passiert?)" text={narrativeActionPrompt} onTextChange={setNarrativeActionPrompt} />}
                      {germanVoiceoverScript && <PromptDisplay title="Voiceover-Skript-Entwurf (Deutsch)" text={germanVoiceoverScript} onTextChange={setGermanVoiceoverScript} />}
                    </div>
                    {detectedCharacters.length > 0 && (
                      <div className="mt-10 pt-8 border-t border-dark-border">
                        <h3 className="text-xl font-semibold text-brand-light mb-4">Automatisch erkannte Charaktere</h3>
                        <p className="text-dark-text-secondary mb-4">Dies sind die Charaktere, die die KI in den Video-Frames identifiziert hat.</p>
                        <div className="p-4 bg-dark-bg/50 rounded-lg border border-dark-border">
                          <ul className="list-disc list-inside text-dark-text">
                            {detectedCharacters.map((char, index) => (
                              <li key={index}>{char}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-semibold text-white mb-6">Schritt {detailsStepNumber}: Idee bestätigen</h2>
                     <div className="space-y-8">
                        <PromptDisplay title="Deine Prompt-Idee" text={userPromptIdea} onTextChange={setUserPromptIdea} editable={true} />
                        {cameos.length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold text-brand-light mb-3">Definierte Cameos</h3>
                                <div className="p-4 bg-dark-bg/50 rounded-lg border border-dark-border space-y-2">
                                    {cameos.map(c => (
                                        <div key={c.id} className="flex items-center gap-4">
                                            <span className="font-bold text-white">{c.name || '[Kein Name]'}</span>
                                            <span className="text-dark-text-secondary">wird beschrieben als</span>
                                            <span className="italic text-brand-light">"{c.character || '[Keine Beschreibung]'}"</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>
                  </>
                )}
                
                <div className="mt-10 pt-8 border-t border-dark-border">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <button onClick={resetState} className="text-gray-400 hover:text-white transition-colors">Von vorne anfangen</button>
                      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                          <button
                              onClick={() => generateFinalPrompt('veo')}
                              disabled={isCameoIncomplete}
                              className="w-full bg-gray-600 hover:bg-gray-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition-colors duration-200 text-base"
                          >
                              Prompt für Veo erstellen
                          </button>
                          <button
                              onClick={() => generateFinalPrompt('sora')}
                              disabled={isCameoIncomplete}
                              className="w-full bg-brand-purple hover:bg-violet-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition-colors duration-200 text-base"
                          >
                              Prompt für Sora 2 erstellen
                          </button>
                      </div>
                  </div>
                   {isCameoIncomplete && <p className="text-right text-red-400 mt-2 text-sm">Bitte füllen Sie für jedes Cameo sowohl den Namen als auch die Beschreibung aus.</p>}
                </div>
              </div>
            )}
            
            {currentStep === finalStepNumber && (
              <div>
                 <h2 className="text-3xl font-semibold text-white mb-6 text-center">
                  Schritt {finalStepNumber}: Dein finales Skript & visuelles Konzept
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
                    <div className="w-full bg-dark-bg rounded-lg border border-dark-border flex items-center justify-center p-2 min-h-[400px]">
                         {previewImageUrl ? (
                            <img src={previewImageUrl} alt="Visuelles Konzept Vorschau" className="rounded-md w-full h-full object-contain" />
                         ) : (
                            <p className="text-dark-text-secondary text-center">Vorschau konnte nicht geladen werden.<br/>Der Prompt wurde jedoch erfolgreich erstellt.</p>
                         )}
                    </div>
                    <div className="flex flex-col h-full">
                        {finalEnglishPrompt && 
                            <PromptDisplay 
                                title={`Prompt für ${finalPromptTarget === 'sora' ? 'Sora 2' : 'Veo'}`} 
                                text={finalEnglishPrompt} 
                                onTextChange={setFinalEnglishPrompt} 
                                editable={true} 
                            />}
                    </div>
                </div>
                 <div className="mt-12 text-center">
                  <button onClick={resetState} className="px-6 py-3 border border-dark-border rounded-lg hover:bg-dark-border transition-colors text-dark-text-secondary hover:text-white font-semibold">
                    Neue Szene erstellen
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;