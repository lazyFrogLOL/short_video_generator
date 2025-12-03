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
    4. **Authentic Engagement**: The opening should help viewers quickly engage with the content, NOT deceive them with clickbait. Content quality is what truly drives traffic, not extreme hooks.

    Target audience: Gen Z & Millennials (Short video platforms).
    Style: Conversational, Engaging, Informative. Like a knowledgeable friend sharing valuable insights.
    Language: Simplified Chinese (Oral/Spoken, use "我们", "你", no formal written style).
    
    Structure the response as a JSON object containing an array of exactly 11 scenes.
    Total duration: Approx 120-180 seconds.
    
    **CRITICAL: AVOID CLICKBAIT OPENINGS**
    DO NOT use sensational hooks like:
    - "99%的人都不知道的秘密" (99% of people don't know this secret)
    - "这条视频价值百万" (This video is worth millions)
    - "Everything you know about X is WRONG!"
    - "Stop doing this!"
    
    These are deceptive and constitute short video fraud. Instead, use authentic, value-driven openings.
    
    **EFFECTIVE OPENING TYPES (Choose ONE for Scene 1):**
    1. **Content Preview (内容预告)**: Directly summarize the core value of the video in one sentence.
       Example: "47年女生和大外孙去网吧的一天" (A 47-year-old woman and her grandson go to an internet cafe for a day)
    
    2. **Value Packaging (价值包装)**: Directly convey the core value to satisfy viewers' need for "gain".
       Example: "看完这条视频你就能无痛的把烟戒掉" (After watching this video, you can quit smoking painlessly)
    
    3. **Phenomenon First (现象前置)**: Start with a common social phenomenon or life scenario to enhance viewer resonance.
       Example: "拉布布的爆火" (The explosion of Labubu), "年轻人不愿意结婚" (Young people don't want to get married)
    
    4. **Event Opening (事件开场)**: Directly describe a specific event that happened, often used in vlog-style videos.
       Example: "那天我出了车祸" (That day I had a car accident)
       Key: The event must have conflict, as conflict is the core driver for continued viewing.
    
    5. **Topic Opening (话题开场)**: Propose a universal topic that can spark widespread discussion.
       Example: "一个普通人怎样才能做到年入30万，而且是从零开始" (How can an ordinary person earn 300k a year, starting from zero)
    
    6. **Direct Address (喊话观众)**: Directly speak to the audience or set interactive instructions.
       Example: "如果你今年跟我一样，三十几岁还没有结婚的话" (If you're like me this year, in your thirties and not married yet)
    
    7. **Hit the Pain Point (直击痛点)**: Target common pain points or needs of the target audience.
       Example: "养猫会掉毛" (Cats shed), "减肥不掉秤" (Can't lose weight despite dieting)
    
    Script Structure (The "Viral Retention" Formula):
    - Scene 1 (The Opening): **CRITICAL**: Use ONE of the 7 effective opening types above. Create genuine engagement through value, resonance, or curiosity - NOT deception. The opening should help viewers quickly engage with the content.
    - Scene 2-4 (The Context & Development): Build understanding. Why does this matter? What's the background? Develop the topic naturally.
    - Scene 5-10 (The High-Density Value): The Solution/Knowledge. NO FLUFF. Every sentence must deliver new information or emotional impact. Fast pacing but clear.
    - Scene 11 (The CTA): Natural summary and "Follow for more".

    **CRITICAL: SCENE TRANSITIONS & COHESION**
    Each scene MUST flow naturally into the next. Avoid abrupt topic changes.
    - **Transition Techniques**: Use connecting phrases like "不仅如此"、"更重要的是"、"接下来"、"其实"、"你知道吗"、"另外"、"同时"、"所以" to bridge scenes naturally.
    - **Progressive Logic**: Each scene should build on the previous one. Think: "What question does Scene N raise that Scene N+1 answers?"
    - **Ending Hooks**: Each scene's narration should end with a natural transition that makes the viewer want to continue (e.g., "其实还有..."、"更有趣的是..."、"接下来..."、"不仅如此..."). Avoid overly dramatic hooks like "但真相是..." or "更惊人的是..." unless truly warranted.
    - **Narrative Arc**: Maintain a clear progression: Opening → Context → Value Part 1 → Value Part 2 → ... → Conclusion.
    - **Avoid**: Sudden topic jumps, clickbait language, or extreme claims. Each scene should feel like a natural continuation, not a disconnected segment.

    Each scene should have:
    - title: Short punchy title (2-6 chars). Avoid sensational or clickbait titles.
    - narration: Natural and conversational. Short sentences. Max 100-150 characters per scene. **MUST include transition elements** connecting to previous/next scene. Use authentic, value-driven language rather than sensational claims.
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
  
  const isLast = sceneIndex === totalScenes - 1;

  let finalPrompt = "";

  if (isLast) {
    // Last Scene: High Impact / Pop Art (CTA)
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
  } else {
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
  
  // Add [medium pause] at the end of narration for a pause between scenes
  const textWithPause = `${cleanedText} [medium pause]。`;

  try {
      const chat = await client.chat.completions.create({
        model: "gemini-2.5-pro-tts",
        messages: [{role: "user", content: textWithPause}]
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

