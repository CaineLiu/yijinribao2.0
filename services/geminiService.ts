
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, EXAMPLE_PROMPT_1, EXAMPLE_OUTPUT_1, EXAMPLE_PROMPT_2, EXAMPLE_OUTPUT_2 } from '../constants.ts';

export type ReportMode = 'public' | 'private' | 'ip';

/**
 * 极速版清洗引擎 - 修复了 404 模型未找到错误并优化了响应稳定性
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
    throw new Error("API_KEY_MISSING: 未检测到 API 密钥。请点击上方「配置中心」填入您的个人 Gemini API Key。");
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

  const finalPrompt = `请严格按照指令清洗以下日报数据，仅输出 TSV 格式内容：\n\n${inputText}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // 使用 gemini-3-flash-preview：这是目前最稳定的基础文本模型，解决 404 错误
    const result = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
      config: {
        systemInstruction: dynamicSystemInstruction,
        temperature: 0.1,
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
        if (accumulatedText.includes('[MODE:PRIVATE]')) { 
          detectedMode = 'private'; 
          modeFound = true; 
        } else if (accumulatedText.includes('[MODE:IP]')) { 
          detectedMode = 'ip'; 
          modeFound = true; 
        } else if (accumulatedText.includes('[MODE:PUBLIC]')) { 
          detectedMode = 'public'; 
          modeFound = true; 
        }
      }

      const cleanTsv = accumulatedText
        .replace(/\[MODE:.*?\]/g, '')
        .replace(/```[a-zA-Z]*\n?/g, '')
        .replace(/```/g, '')
        .trimStart();
        
      onChunk(cleanTsv, detectedMode);
    }
  } catch (error: any) {
    console.error("Gemini Engine Stream Error:", error);
    const errorMsg = error.message?.toLowerCase() || "";
    
    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      throw new Error("模型未找到 (404)。这通常是因为 API Key 无权访问该模型，请在配置中心尝试更换有效的个人 API Key。");
    } else if (errorMsg.includes("403") || errorMsg.includes("permission denied")) {
      throw new Error("访问被拒绝 (403)。请检查您的 API Key 是否已激活，并确保项目已启用 Gemini API。");
    } else if (errorMsg.includes("429")) {
      throw new Error("请求过于频繁 (429)。请稍等片刻后再试。");
    } else if (errorMsg.includes("fetch") || errorMsg.includes("network")) {
      throw new Error("网络连接超时。请检查您的网络环境，或在配置中心填入您自己的 API Key。");
    }
    
    throw new Error(error.message || "连接异常，请重试。");
  }
};
