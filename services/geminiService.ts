
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, EXAMPLE_PROMPT_1, EXAMPLE_OUTPUT_1, EXAMPLE_PROMPT_2, EXAMPLE_OUTPUT_2 } from '../constants.ts';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type ReportMode = 'public' | 'private' | 'ip';

export const cleanReportData = async (
  inputText: string, 
  staffList: string, 
  ipList: string, 
  forcedMode: 'auto' | 'public' | 'private' | 'ip',
  userApiKey?: string
): Promise<{ text: string, mode: ReportMode }> => {
  // 优先级：用户手动输入的 Key > 环境变量注入的 Key
  const apiKey = userApiKey?.trim() || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("未检测到 API Key。请在「配置中心」填入您的个人 Gemini API Key 或联系管理员。");
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
      // 严格遵循 SDK 指南：初始化仅传入 apiKey
      const ai = new GoogleGenAI({ 
        apiKey
      });
      
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

      if (!cleanTsvText) throw new Error("模型响应解析失败。");

      return { text: cleanTsvText, mode };
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      const errMsg = error.message?.toLowerCase() || "";
      // 网络问题尝试重试
      if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('failed')) {
        await sleep(800);
        continue;
      }
      // 如果是 Key 错误或配额错误，直接报错不重试
      if (errMsg.includes('api_key_invalid') || errMsg.includes('403') || errMsg.includes('limit')) {
        break;
      }
      await sleep(1000 * (attempt + 1));
    }
  }

  const finalErrorMessage = lastError?.message || "未知错误";
  if (finalErrorMessage.includes('API_KEY_INVALID') || finalErrorMessage.includes('403')) {
    throw new Error("API Key 无效或权限受限。请在「配置中心」检查您的 Key 设置。");
  }
  if (finalErrorMessage.includes('fetch')) {
    throw new Error("无法连接到清洗引擎。Zeabur 部署通常能直接访问，请检查您的 API Key 是否开启了正确的 API 权限。");
  }
  throw new Error(finalErrorMessage);
};
