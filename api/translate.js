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
        // 使用 gemini-1.5-flash 模型，速度更快且成本更低，适合翻译任务
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `
            你是一位专业的游戏美术术语翻译专家。请将以下中文数组中的内容翻译成地道的英文。要求如下：
            
            1. 术语专业：涉及游戏视觉表现、美术流派（如：次世代、PBR、等距视角、暗黑风格）时，使用行业标准的英语术语。
            2. 语境一致：所有内容都源自同一个游戏画面描述，请确保翻译风格的前后一致性。
            3. 格式要求：直接返回一个 JSON 对象，包含一个名为 "translatedTexts" 的字符串数组，数组顺序必须与输入数组完全一致。
            4. 保持原样：如果数组中的某项已经是英文、数字或特殊字符，请直接保留。
            5. 不要多言：只输出要求的 JSON。

            待翻译数组：
            ${JSON.stringify(texts)}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonText = response.text();
        const data = JSON.parse(jsonText);

        res.status(200).json(data);

    } catch (error) {
        console.error('Translation API Error:', error);
        res.status(500).json({ error: error.message || '内部服务器错误' });
    }
}
