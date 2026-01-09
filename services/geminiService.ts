
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants.ts';

export type ReportMode = 'public' | 'private' | 'ip';

/**
 * 增强型清洗引擎
 */
export const cleanReportDataStream = async (
  inputText: string, 
  staffList: string, 
  ipList: string, 
  forcedMode: ReportMode,
  userApiKey: string,
  onChunk: (text: string) => void
): Promise<void> => {
  const apiKey = userApiKey?.trim() || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: 未检测到 API 密钥。请在「配置中心」填入您的个人 Gemini API Key。");
  }

  const now = new Date();
  const currentDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  
  const modeName = forcedMode === 'public' ? '公域模式' : forcedMode === 'private' ? '私域模式' : 'IP模式';
  
  const dynamicSystemInstruction = SYSTEM_INSTRUCTION
    .replace('{Current Date}', currentDate)
    .replace('{Staff List}', staffList)
    .replace('{IP List}', ipList)
    .replace('{Mode Name}', modeName);

  const finalPrompt = `执行数据清洗任务：\n\n${inputText}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const result = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
      config: {
        systemInstruction: dynamicSystemInstruction,
        temperature: 0,
      }
    });

    let accumulatedText = "";

    for await (const chunk of result) {
      const chunkText = chunk.text || "";
      if (!chunkText) continue;
      
      accumulatedText += chunkText;

      const cleanTsv = accumulatedText
        .replace(/\[MODE:.*?\]/g, '')
        .replace(/```[a-zA-Z]*\n?/g, '')
        .replace(/```/g, '')
        .trimStart();
        
      onChunk(cleanTsv);
    }
  } catch (error: any) {
    console.error("Engine Connection Error:", error);
    const errorMsg = error.message || JSON.stringify(error);
    const lowerError = errorMsg.toLowerCase();
    
    if (lowerError.includes("status code: 0") || lowerError.includes("failed to fetch")) {
      throw new Error("网络请求被拦截 (Status 0)。\n请确保已开启 VPN 并设置为全局模式，或在「配置中心」检查个人 API Key。");
    } else if (lowerError.includes("500")) {
      throw new Error("引擎响应异常 (500)。请重试。");
    } else if (lowerError.includes("403") || lowerError.includes("key")) {
      throw new Error("API Key 无效。请前往配置中心检查。");
    }
    
    throw new Error(error.message || "清洗引擎连接失败。");
  }
};
