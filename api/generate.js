import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { image, mimeType } = req.body;

        if (!image || !mimeType) {
            return res.status(400).json({ error: 'Missing image data' });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: '服务器配置错误：未配置 GEMINI_API_KEY 环境变量' });
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        
        const models = ['gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview'];
        let result = null;
        let lastError = null;

        const prompt = `
                你是一位资深的游戏视觉分解专家与美术指导。请专业、细致地分析这张游戏截图，并以此 JSON 格式返回。所有输出文本必须是中文。
                
                指令与要求：
                1. 专业性：请尽可能使用游戏行业标准的美术术语（如：次世代PBR渲染、全局光照GI、体积雾、等距视角、环境光遮蔽AO等）。
                2. 准确性：如图片中不存在某些元素（如没有敌人、没有UI等），请将对应字段设为空字符串 "" 或空数组 []，不要无中生有。
                3. 细节捕捉：请仔细留意材质细节、打光倾向、色彩对比（主色调与强调色）及人物的具体姿势构图。
                
                请严格按照以下 JSON 数据结构输出（保持字段名不变）：
                {
                    "objective": "一句话精炼概括画面的核心表现目标",
                    "sceneType": "场景玩法类型（如等距视角动作RPG、俯视角SLG）",
                    "cameraView": "相机视角（如斜45度等距视角、俯视、平视）",
                    "cameraDistance": "镜头距离（如近景特写、中景、远景、全景）",
                    "cameraPerspective": "透视方式（如三点透视、正交透视）",
                    "envLocation": "环境地点描述",
                    "envFloor": "地面材质与纹理描述",
                    "architecture": ["建筑或地标元素1", "建筑元素2"],
                    "envAtmosphere": "整体环境氛围（如压抑、史诗、阴森）",
                    "lightPrimary": "主光源类型及方向",
                    "colorContrast": ["冷暖色对比或补色对比描述1", "描述2"],
                    "lightEffects": ["具体光效描述（如丁达尔效应、泛光）", "光效2"],
                    "heroes": [
                        { "role": "主要角色职业定位", "armor": "穿着护甲类型", "weapon": "持有武器", "pose": "当前动作姿态", "appearance": "外貌状态细节", "magic": "技能特效表现" }
                    ],
                    "enemies": [
                        { "type": "敌对单位类型", "behavior": "当前行为模式", "appearance": ["外观特征细节1", "特征2"] }
                    ],
                    "combatBlood": "战斗相关血腥/受击程度描述",
                    "combatMagic": ["全局或区域魔法/受击特效1", "特效2"],
                    "combatEnvInteraction": "战斗对环境的破坏或交互描述",
                    "uiHud": ["显著的HUD/UI组件1", "UI组件2"],
                    "uiStyle": "UI的整体视觉风格（如写实、扁平、扁平化拟物）",
                    "artGenre": "核心艺术流派（如暗黑哥特、废土科幻）",
                    "artStyle": "美术风格倾向（如美漫风、高写实、低多边形）",
                    "artInfluence": ["可能有参考价值的游戏/艺术作品风格", "风格2"],
                    "artRendering": "渲染管线或画质特征表现（如卡通渲染、写实PBR）",
                    "colorDominant": ["占据画面主导的颜色1", "颜色2"],
                    "colorAccent": ["用于视觉引导或高光强调的颜色1", "颜色2"],
                    "qualityDetail": "细节丰富度评估",
                    "qualityResolution": "原生画面分辨率预估",
                    "qualitySharpness": "画面锐度与清晰度"
                }
                `;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: 'application/json' }
                });
                result = await model.generateContent([
                    prompt,
                    { inlineData: { data: image, mimeType: mimeType } }
                ]);
                break; // 成功则跳出循环
            } catch (err) {
                console.error(`模型 ${modelName} 调用失败，正在尝试下一个模型...`, err);
                lastError = err;
            }
        }

        if (!result) {
            throw lastError || new Error('所有模型调用均失败');
        }

        const response = await result.response;
        const jsonText = response.text();
        const data = JSON.parse(jsonText);

        res.status(200).json(data);

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message || '内部服务器错误' });
    }
}
