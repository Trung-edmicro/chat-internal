import { GoogleGenAI } from "@google/genai";

// Initialize GenAI Client
// Note: import.meta.env.VITE_GEMINI_API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const analyzeConversation = async (messages: string[]): Promise<string> => {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        return "Error: API Key not configured.";
    }

    // Combine last few messages for context
    const conversationText = messages.slice(-10).join("\n");

    const prompt = `
      Bạn là một trợ lý bảo mật thông minh. Hãy tóm tắt ngắn gọn đoạn hội thoại sau và đánh giá sắc thái cảm xúc.
      Trả lời bằng Tiếng Việt.
      
      Hội thoại:
      ${conversationText}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Không thể phân tích.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Lỗi kết nối với AI.";
  }
};

export const quickReplySuggestion = async (lastMessage: string): Promise<string[]> => {
    try {
        if (!import.meta.env.VITE_GEMINI_API_KEY) return [];
        
        const prompt = `Đề xuất 3 câu trả lời ngắn gọn (dưới 10 từ) cho tin nhắn này bằng tiếng Việt: "${lastMessage}"`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
             config: {
                responseMimeType: "application/json",
             }
        });
        
        // Trying to parse specific JSON format, handling potential format variances
        const text = response.text;
        if (!text) return [];
        
        // Basic cleanup if md block returned
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        
        if (Array.isArray(parsed)) return parsed;
        if (parsed.replies && Array.isArray(parsed.replies)) return parsed.replies;
        
        return [];
    } catch (e) {
        console.error(e);
        return [];
    }
}