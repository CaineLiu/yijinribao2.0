
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, EXAMPLE_PROMPT_1, EXAMPLE_OUTPUT_1, EXAMPLE_PROMPT_2, EXAMPLE_OUTPUT_2 } from '../constants.ts';

export type ReportMode = 'public' | 'private' | 'ip';

/**
 * 带有自愈能力的流式清洗引擎
 */
export const cleanReportDataStream = async (
  inputText: string, 
  staffList: string, 
  ipList: string, 
  forcedMode: 'auto' | 'public' | 'private' | 'ip',
  userApiKey: string,
  onChunk: (text: string, mode: ReportMode) => void
): Promise<void> => {
  const apiKey = userApiKey?.trim() || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: 未检测到 API 密钥。请点击「配置中心」填入您的个人 Gemini API Key。");
  }

  const now = new Date();
  const currentDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  
  let dynamicSystemInstruction = SYSTEM_INSTRUCTION
    .replace('{Current Date}', currentDate)
    .replace('{Staff List}', staffList)
    .replace('{IP List}', ipList);

  if (forcedMode !== 'auto') {
    const modeName = forcedMode === 'public' ? '公域模式' : forcedMode === 'private' ? '私域模式' : 'IP团队模式';
    dynamicSystemInstruction = dynamicSystemInstruction.replace(
      '{Forced Mode Prompt}', 
      `注意：任务已强制指定为 **${modeName}**。`
    );
  } else {
    dynamicSystemInstruction = dynamicSystemInstruction.replace('{Forced Mode Prompt}', '');
  }

  const finalPrompt = `请严格执行清洗任务：\n${inputText}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // 优先尝试 gemini-3-flash-preview 提速
    // 如果该模型在您的 API 权限中未激活，可手动切换为 'gemini-2.5-flash'
    const result = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
      config: {
        systemInstruction: dynamicSystemInstruction,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    let accumulatedText = "";
    let detectedMode: ReportMode = 'public';
    let modeFound = false;

    for await (const chunk of result) {
      const chunkText = chunk.text || "";
      accumulatedText += chunkText;

      if (!modeFound) {
        if (accumulatedText.includes('[MODE:PRIVATE]')) { detectedMode = 'private'; modeFound = true; }
        else if (accumulatedText.includes('[MODE:IP]')) { detectedMode = 'ip'; modeFound = true; }
        else if (accumulatedText.includes('[MODE:PUBLIC]')) { detectedMode = 'public'; modeFound = true; }
      }

      const cleanTsv = accumulatedText
        .replace(/\[MODE:.*?\]/g, '')
        .replace(/```[a-zA-Z]*\n?/g, '')
        .replace(/```/g, '')
        .trimStart();
        
      onChunk(cleanTsv, detectedMode);
    }
  } catch (error: any) {
    console.error("Engine Error:", error);
    const errorMsg = error.message || "";
    
    if (errorMsg.includes("403") || errorMsg.includes("API_KEY_INVALID")) {
      throw new Error("API Key 验证失败。请检查密钥是否正确，或是否开启了 Gemini API 权限。");
    } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      throw new Error("所选模型不可用。这通常是由于 API Key 权限受限，请尝试在配置中心更换密钥。");
    } else if (errorMsg.includes("fetch") || errorMsg.includes("network")) {
      throw new Error("网络连接超时。如果您正在使用公司内网，请检查防火墙设置，或尝试使用个人 Key。");
    }
    
    throw new Error(errorMsg || "清洗引擎连接异常，请重试。");
  }
};
