
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, EXAMPLE_PROMPT_1, EXAMPLE_OUTPUT_1, EXAMPLE_PROMPT_2, EXAMPLE_OUTPUT_2 } from '../constants.ts';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type ReportMode = 'public' | 'private' | 'ip';

export const cleanReportData = async (
  inputText: string, 
  staffList: string, 
  ipList: string, 
  forcedMode: 'auto' | 'public' | 'private' | 'ip'
): Promise<{ text: string, mode: ReportMode }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("系统配置错误：API Key 缺失。");

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

  const finalPrompt = `请根据以下参考示例清洗数据：

[示例1 输入]
${EXAMPLE_PROMPT_1}
[示例1 输出]
${EXAMPLE_OUTPUT_1}

[示例2 输入]
${EXAMPLE_PROMPT_2}
[示例2 输出]
${EXAMPLE_OUTPUT_2}

[待处理数据]
${inputText}`;

  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        config: {
          systemInstruction: dynamicSystemInstruction,
          temperature: 0.1,
        }
      });

      const fullText = response.text || "";
      const cleanedFullText = fullText.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();

      let mode: ReportMode = 'public';
      let cleanTsvText = cleanedFullText;

      if (cleanedFullText.includes('[MODE:PRIVATE]')) {
        mode = 'private';
        cleanTsvText = cleanedFullText.replace('[MODE:PRIVATE]', '').trim();
      } else if (cleanedFullText.includes('[MODE:IP]')) {
        mode = 'ip';
        cleanTsvText = cleanedFullText.replace('[MODE:IP]', '').trim();
      } else if (cleanedFullText.includes('[MODE:PUBLIC]')) {
        mode = 'public';
        cleanTsvText = cleanedFullText.replace('[MODE:PUBLIC]', '').trim();
      }

      if (!cleanTsvText) throw new Error("模型返回数据为空。");

      return { text: cleanTsvText, mode };
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('500') || error.message?.includes('Rpc failed') || error.message?.includes('xhr')) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  const errorMsg = lastError?.message || "未知清洗错误";
  if (errorMsg.includes('500') || errorMsg.includes('Rpc failed')) {
    throw new Error("清洗引擎暂时不可用 (RPC 500)。请尝试刷新页面重试。");
  }
  throw lastError;
};
