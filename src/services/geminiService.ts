import { GoogleGenAI, Modality } from "@google/genai";

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. AI features will not work.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
}

export async function generateStory(planeName: string, cityName: string, words: string[]) {
  const prompt = `
    You are a creative storyteller for toddlers (age 2-4). Write a very simple 5-page picture book story about a pilot and their plane.
    
    Context:
    - Plane: ${planeName}
    - Destination: ${cityName}
    - Magic objects to find: ${words[0]} and ${words[1]}
    
    Rules:
    1. Exactly 5 pages.
    2. Each page is one very short, grammatically correct sentence (max 5 words).
    3. Use extremely simple, common words for toddlers.
    4. Ensure sentences are complete and natural.
    5. The story MUST include the plane name, the city name, and both magic objects.
    
    Structure:
    - Page 1: Introduction of the ${planeName}.
    - Page 2: Traveling to ${cityName}.
    - Page 3: Finding the ${words[0]}.
    - Page 4: Finding the ${words[1]}.
    - Page 5: A happy ending for the pilot.
    
    Output ONLY the story text, each page on a new line. No page numbers, no markdown, no titles.
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest", // Using the stable latest flash model
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.8, // Add some variety
      }
    });
    
    const text = response.text?.trim();
    if (text && text.split('\n').length >= 3) {
      return text;
    }
    
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Error generating story:", error);
    // Dynamic fallback so it's not always the same even on failure
    return `Look at the ${planeName}!\nWe fly to ${cityName}.\nI see a ${words[0]}.\nI see a ${words[1]}.\nThe pilot is happy!`;
  }
}

export async function generateStoryImage(sentence: string, cityName: string) {
  try {
    const ai = getAI();
    const prompt = `A simple, cute, colorful cartoon illustration for a children's picture book. Scene: ${sentence} in ${cityName}. Soft colors, friendly characters, no text in image.`;
    
    // Use a race to implement a timeout
    const imagePromise = ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: prompt }],
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        },
      },
    });

    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 30000) // Increased to 30s
    );

    const response = await Promise.race([imagePromise, timeoutPromise]);

    if (!response || !response.candidates?.[0]?.content?.parts) {
      return `https://picsum.photos/seed/${encodeURIComponent(sentence)}/800/600`;
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return `https://picsum.photos/seed/${encodeURIComponent(sentence)}/800/600`;
  } catch (error) {
    // If it's a timeout, we still return the fallback but maybe log it differently
    if (error instanceof Error && error.message === "Timeout") {
      console.warn("Image generation timed out, using fallback.");
    } else {
      console.error("Error generating image:", error);
    }
    return `https://picsum.photos/seed/${encodeURIComponent(sentence)}/800/600`;
  }
}

function base64ToUint8Array(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createWavHeader(pcmLength: number, sampleRate: number = 24000) {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF identifier 'RIFF'
  view.setUint32(0, 0x52494646, false);
  // file length
  view.setUint32(4, 36 + pcmLength, true);
  // RIFF type 'WAVE'
  view.setUint32(8, 0x57415645, false);
  // format chunk identifier 'fmt '
  view.setUint32(12, 0x666d7420, false);
  // format chunk length
  view.setUint16(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier 'data'
  view.setUint32(36, 0x64617461, false);
  // data chunk length
  view.setUint32(40, pcmLength, true);

  return new Uint8Array(buffer);
}

export async function generateSpeech(text: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly and slowly with a gentle American English accent for a toddler: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            // 'Zephyr' is often more natural/smooth
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const pcmData = base64ToUint8Array(base64Audio);
      const wavHeader = createWavHeader(pcmData.length, 24000);
      const wavData = new Uint8Array(wavHeader.length + pcmData.length);
      wavData.set(wavHeader);
      wavData.set(pcmData, wavHeader.length);
      
      const blob = new Blob([wavData], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
}
