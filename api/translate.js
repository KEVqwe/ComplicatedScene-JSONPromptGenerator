import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { texts } = req.body;

        if (!texts || !Array.isArray(texts)) {
            return res.status(400).json({ error: 'Missing or invalid texts array' });
        }

        if (texts.length === 0) {
            return res.status(200).json({ translatedTexts: [] });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: '服务器配置错误：未配置 GEMINI_API_KEY 环境变量' });
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        // 使用用户指定的模型
        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: { 
                responseMimeType: 'application/json',
                temperature: 0.1 // 降低随机性，确保翻译稳定性
            }
        });

        const prompt = `
            # ROLE
            You are a professional game art assets and prompt translation expert. 
            Your task is to translate the provided CHINESE text array into high-quality, game-industry standard ENGLISH.

            # INSTRUCTIONS
            1.  **MANDATORY TRANSLATION**: Every Chinese string in the input array MUST be translated into English. Do NOT return the original Chinese.
            2.  **TERMINOLOGY**: Use professional terms for game aesthetics, views, and rendering (e.g., "Isometric", "PBR", "Global Illumination", "Dark Fantasy").
            3.  **PRESERVE NON-CHINESE**: If a string contains ONLY English, numbers, or special symbols (e.g., "RTX 3080", "4K"), keep it as is.
            4.  **CONSISTENCY**: Ensure terminology remains consistent across all elements in the array.
            5.  **OUTPUT FORMAT**: Strictly return a single JSON object with a key "translatedTexts" containing a string array of exactly the same length and order as the input.

            # EXAMPLES
            Input: ["等距视角动作RPG", "暗黑哥特风", "覆盖着血液的地面"]
            Output: {"translatedTexts": ["Isometric Action RPG", "Dark Gothic Style", "Blood-covered ground"]}

            Input: ["RTX 开启", "1920x1080"]
            Output: {"translatedTexts": ["RTX On", "1920x1080"]}

            # DATA TO TRANSLATE
            INPUT ARRAY (JSON FORMAT):
            ${JSON.stringify(texts)}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonText = response.text();
        
        // 健壮性：手动处理可能的 Markdown 代码块包裹
        if (jsonText.includes('```')) {
            jsonText = jsonText.replace(/```json|```/g, '').trim();
        }

        const data = JSON.parse(jsonText);

        if (!data.translatedTexts || !Array.isArray(data.translatedTexts)) {
            throw new Error('LLM output format is invalid');
        }

        res.status(200).json(data);

    } catch (error) {
        console.error('Translation API Error:', error);
        res.status(500).json({ error: error.message || '内部服务器错误' });
    }
}
