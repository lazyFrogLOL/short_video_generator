import OpenAI from "openai";
import { StoryboardResponse, ImageSize } from "../types";

// Helper to get OpenAI instance safely
const getClient = () => {
  const apiKey = process.env.POE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please select a valid API Key.");
  }
  // Construct full URL for browser usage to satisfy URL constructor
  // Use local proxy to avoid CORS (OpenAI SDK requires valid URL with protocol in browser)
  // In Vite dev, window.location.origin handles the proxy.
  // In production, you might need a real backend or same-origin proxy.
  const baseURL = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/poe`
    : "http://localhost:3000/api/poe";

  return new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    dangerouslyAllowBrowser: true
  });
};

// Helper to fetch a URL and convert to Base64
async function fetchResourceAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch resource: ${response.statusText}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove data:image/png;base64, prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const generateScript = async (topic: string, context: string): Promise<StoryboardResponse> => {
  console.log(`[Poe] Generating script for topic: ${topic}`);
  const client = getClient();
  
  const prompt = `
    Create a viral short video script (TikTok/Shorts style) about "${topic}".
    
    Context / Detailed Description / Source Material:
    "${context}"

    **CORE PHILOSOPHY (CRITICAL):**
    1. **Platform Alignment**: The content must help the platform RETAIN users.
    2. **User-Centric**: Provide EMOTIONAL VALUE and HIGH INFORMATION DENSITY.
    3. **The "Why":** Before generating, ask yourself: "Why would a user finish watching this?" If it's boring, rewrite it.
    4. **Conflict & Expectation**: Start by BREAKING EXPECTATIONS. Create immediate emotional fluctuation.

    Target audience: Gen Z & Millennials (Short video platforms).
    Style: High Energy, Conversational, Vlogger/YouTuber style.
    Language: Simplified Chinese (Oral/Spoken, use "我们", "你", no formal written style).
    
    Structure the response as a JSON object containing an array of exactly 15 scenes.
    Total duration: Approx 120-180 seconds.
    
    Script Structure (The "Viral Retention" Formula):
    - Scene 1 (The Hook & Conflict): **CRITICAL**: Create conflict or break expectations immediately. (e.g., "Everything you know about X is WRONG!", "Stop doing this!"). Make the user feel something.
    - Scene 2-5 (The Pain/Agitation): Amplify the conflict. Why does this matter? What is the consequence of ignorance?
    - Scene 6-14 (The High-Density Value): The Solution/Knowledge. NO FLUFF. Every sentence must deliver new information or emotional impact. Fast pacing.
    - Scene 15 (The CTA): Summary and "Follow for more".

    **CRITICAL: SCENE TRANSITIONS & COHESION**
    Each scene MUST flow naturally into the next. Avoid abrupt topic changes.
    - **Transition Techniques**: Use connecting phrases like "不仅如此"、"更重要的是"、"接下来"、"但问题是"、"所以"、"其实"、"你知道吗"、"更关键的是" to bridge scenes.
    - **Progressive Logic**: Each scene should build on the previous one. Think: "What question does Scene N raise that Scene N+1 answers?"
    - **Ending Hooks**: Each scene's narration should end with a mini-hook that makes the viewer want to continue (e.g., "但真相是..."、"更惊人的是..."、"接下来...").
    - **Narrative Arc**: Maintain a clear progression: Problem → Why it matters → Solution Part 1 → Solution Part 2 → ... → Conclusion.
    - **Avoid**: Sudden topic jumps. Each scene should feel like a natural continuation, not a disconnected segment.

    Each scene should have:
    - title: Short punchy title (2-6 chars).
    - narration: Fast-paced. Short sentences. Max 100-150 characters per scene. **MUST include transition elements** connecting to previous/next scene.
    - durationInSeconds: 15-22 seconds.
    - visual_description: A concise description for a vertical 9:16 image.
      **VISUAL GUIDELINES:**
      - High visual impact, bold colors, center composition.
      - Use "Split screen", "Big Bold Text", "Zoomed in details".
      - You MUST explicitly state: "Text 'KEYWORD' in Simplified Chinese is displayed" for key terms.
  `;

  try {
    const chat = await client.chat.completions.create({
      model: "gemini-3-pro",
      messages: [{role: "user", content: prompt}]
    });

    const text = chat.choices[0].message.content;
    if (!text) {
      throw new Error("Failed to generate script: Empty response text");
    }

    // Cleanup markdown code blocks if present
    let cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

    // Remove "Thinking" process blocks (extract JSON object)
    // Gemini 3 Pro often includes a > **Thinking...** block before the JSON
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    
    console.log(`[Poe] Script generated successfully.`);
    return JSON.parse(cleanText) as StoryboardResponse;

  } catch (error: any) {
    console.error("[Poe] generateScript error:", error);
    if (error.response) {
        console.error("[Poe] Error Response Body:", error.response.data);
    }
    throw error;
  }
};

export const generateImageForScene = async (visualDescription: string, narration: string, size: ImageSize, sceneIndex: number, totalScenes: number): Promise<string> => {
  console.log(`[Poe] Generating image for scene ${sceneIndex + 1}/${totalScenes}`);
  const client = getClient();
  
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === totalScenes - 1;
  const isHighImpact = isFirst || isLast;

  let finalPrompt = "";

  if (!isHighImpact) {
    // Middle Scenes: Hand-drawn Infographic
    finalPrompt = `
        请根据输入内容提取核心主题与要点，生成一张卡通风格的信息图： 
        - 采用手绘风格，竖版（9:16）构图。 
        - 加入少量简洁的卡通元素、图标或名人画像，增强趣味性和视觉记忆。 
        - 如果有敏感人物或者版权内容，画一个相似替代，但是不要拒绝生成 
        - 所有图像、文字必须使用手绘风格，没有写实风格图画元素 
        - 除非特别要求，否则语言与输入内容语言一致（简体中文）。 
        - 信息精简，突出关键词与核心概念，多留白，易于一眼抓住重点。 

        请根据输入的内容画图：
        画面描述: ${visualDescription}
        (相关旁白: ${narration})
    `;
  } else {
    // First & Last: High Impact / Pop Art (Hook & CTA)
    finalPrompt = `
      Create a vertical (9:16) image for a viral short video scene (Scene #${sceneIndex + 1}).
      
      Style: Modern Pop Art / 2.5D Vector Illustration.
      Visuals: High Saturation, Bold Colors, "Explosive" composition, Sticker Art aesthetics.
      Vibe: Exciting, Loud, Attention-Grabbing.
      
      Composition: Center-focused (leave top 10% and bottom 20% relatively clear for UI).
      Aspect Ratio: 9:16 (Vertical Phone Screen).
      
      Input Context:
      Visual: ${visualDescription}
      Narration: ${narration}
      
      Requirements:
      - If text is requested in the description, render it clearly in Simplified Chinese.
      - No realistic photos, strict illustration style.
    `;
  }

  try {
    const chat = await client.chat.completions.create({
      model: "nano-banana-pro",
      messages: [{role: "user", content: finalPrompt}]
    });

    const content = chat.choices[0].message.content || "";
    
    // Extract URL from markdown or raw text
    // Regex for markdown image: ![alt](url) or link [text](url) or just https://...
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    const matches = content.match(urlRegex);
    
    if (!matches || matches.length === 0) {
         console.error("No image URL found in response:", content);
         throw new Error("No image URL found in response");
    }
    
    // Take the first URL found (usually the image URL in Poe responses)
    // Sometimes markdown is ![image](url).
    // We need to be careful not to pick up other links if any.
    // Usually bots reply with just the image or a short text with image.
    // Let's try to find one that looks like an image or just the last one?
    // Poe usually sends ![image](https://poe.com/cdn/...)
    
    const imageUrl = matches[0]; // First match is typically the image
    console.log(`[Poe] Image URL found: ${imageUrl}`);
    
    const base64Image = await fetchResourceAsBase64(imageUrl);
    console.log(`[Poe] Image downloaded and converted for scene ${sceneIndex + 1}`);
    return base64Image;

  } catch (error: any) {
     console.error(`[Poe] generateImageForScene error (Scene ${sceneIndex + 1}):`, error);
     if (error.response) {
        console.error("[Poe] Error Response Body:", error.response.data);
     }
     throw error;
  }
};

export const generateSpeechForScene = async (text: string): Promise<string> => {
  console.log(`[Poe] Generating speech (length: ${text.length})`);
  const client = getClient();
  
  // Clean text for TTS: Replace common symbols that might be read out
  // Keep alphanumeric, chinese, and basic punctuation (,.?!:;)
  const cleanedText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s,，.。?？!！:：;；]/g, ' ');

  try {
      const chat = await client.chat.completions.create({
        model: "gemini-2.5-pro-tts",
        messages: [{role: "user", content: cleanedText}]
      });

      const content = chat.choices[0].message.content || "";
      
      // Extract URL from markdown or raw text (Poe TTS usually returns a file link)
      const urlRegex = /https?:\/\/[^\s\)]+/g;
      const matches = content.match(urlRegex);

      if (!matches || matches.length === 0) {
          console.error("No audio URL found in response:", content);
          throw new Error("No audio URL found in response");
      }

      const audioUrl = matches[0];
      console.log(`[Poe] Audio URL found: ${audioUrl}`);

      const base64Audio = await fetchResourceAsBase64(audioUrl);
      return base64Audio;
  } catch (error) {
      console.error("[Poe] generateSpeechForScene error:", error);
      throw error;
  }
};
