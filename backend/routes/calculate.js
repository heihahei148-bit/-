import express from 'express';
import { Lunar } from 'lunar-javascript';
import { execute } from '../db/index.js';
import { calculateUpload } from '../middleware/upload.js';
import { ICE_BINGJIAN_SYSTEM_PROMPT } from '../prompts/iceBingjianSystemPrompt.js';

const router = express.Router();

function parseBirthDate(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('请填写出生年月日。');
  }

  const normalized = value.includes('T') ? value.split('T')[0] : value;
  const [yearStr, monthStr, dayStr] = normalized.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const birthDate = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(birthDate.getTime()) ||
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    throw new Error('出生年月日格式不正确。');
  }

  return {
    value: normalized,
    date: birthDate
  };
}

function parseAuditPayload(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toPublicUploadPath(filename) {
  return `/uploads/${filename}`;
}

function buildPillars(lunar) {
  return [
    { label: '年柱', value: lunar.getYearInGanZhiByLiChun(), note: '看早年和家庭底色' },
    { label: '月柱', value: lunar.getMonthInGanZhiExact(), note: '看成长环境和习惯' },
    { label: '日柱', value: lunar.getDayInGanZhiExact(), note: '看你本人' }
  ];
}

function getPlainProfileByStem(yearPillar) {
  const stem = yearPillar?.[0] || '';

  const map = {
    甲: {
      firstImpression: '主动、直爽、有开局能力',
      workStyle: '适合先定目标，再一步步推进',
      mood: '情绪来得快，但通常不会拖太久',
      relationship: '讲原则，喜欢直接沟通',
      palmStyle: '先行动，再慢慢修正',
      advice: '别只顾往前冲，给自己留一点缓冲'
    },
    乙: {
      firstImpression: '温和、细致、有耐心',
      workStyle: '适合慢慢铺开，越做越稳',
      mood: '外柔内韧，不爱硬碰硬',
      relationship: '会照顾别人感受',
      palmStyle: '节奏偏稳，适合长期积累',
      advice: '稳是优点，但别把犹豫拖成停顿'
    },
    丙: {
      firstImpression: '外向、热情、有表达欲',
      workStyle: '适合先亮出想法，再用结果说话',
      mood: '热情明显，但要防止急躁',
      relationship: '喜欢带动气氛',
      palmStyle: '行动力强，敢试敢改',
      advice: '热情很好，但节奏别一口气拉太满'
    },
    丁: {
      firstImpression: '安静、细腻、想得比较深',
      workStyle: '适合深耕一个方向，做出细活',
      mood: '表面平静，内里想法很多',
      relationship: '重感觉，也重分寸',
      palmStyle: '细节感强，越熟越稳',
      advice: '想得多没问题，记得把想法落地'
    },
    戊: {
      firstImpression: '稳、可靠、能扛事',
      workStyle: '适合做需要承担和管理的事',
      mood: '不爱折腾，更喜欢确定性',
      relationship: '说话做事比较稳重',
      palmStyle: '偏重积累，越做越厚',
      advice: '稳是底牌，也要给自己留一点灵活度'
    },
    己: {
      firstImpression: '不张扬，但很会照顾局面',
      workStyle: '适合做整合、协调、收尾的活',
      mood: '稳里面带一点细腻',
      relationship: '会顾全别人，也会顾全大局',
      palmStyle: '擅长把零散的东西整理好',
      advice: '优势是稳和细，但别把压力都自己扛'
    },
    庚: {
      firstImpression: '干脆、利落、边界感强',
      workStyle: '适合先定标准，再去执行',
      mood: '判断快，不喜欢拖泥带水',
      relationship: '讲规则，也讲效率',
      palmStyle: '决断力比较明显',
      advice: '标准感是优点，沟通时可以再柔一点'
    },
    辛: {
      firstImpression: '精致、讲分寸、有审美',
      workStyle: '适合做需要细节和标准感的事',
      mood: '克制，心里有自己的标准',
      relationship: '会拿捏距离感',
      palmStyle: '重细节，适合精细活',
      advice: '标准感很强，但别把自己卡得太紧'
    },
    壬: {
      firstImpression: '灵活、反应快、适应力强',
      workStyle: '擅长变通，能适应不同局面',
      mood: '想法多，变化也快',
      relationship: '容易看懂别人的状态',
      palmStyle: '转弯能力强，适合灵活应对',
      advice: '灵活是优势，但别让自己太分散'
    },
    癸: {
      firstImpression: '安静、敏感、观察力不错',
      workStyle: '适合先观察，再稳稳出手',
      mood: '内心细，想得深',
      relationship: '感受力强，但不一定马上说出来',
      palmStyle: '更像蓄力型，后劲不错',
      advice: '不用急着证明自己，循序渐进更适合你'
    }
  };

  return (
    map[stem] || {
      firstImpression: '整体比较均衡，走稳路线',
      workStyle: '适合稳扎稳打',
      mood: '温和持中',
      relationship: '相处上比较自然',
      palmStyle: '收放比较得当',
      advice: '保持节奏，比追求刺激更适合你'
    }
  );
}

function buildMockAnalysis({ name, birthDate, pillars }) {
  const profile = getPlainProfileByStem(pillars[0].value);
  const knownPillars = pillars.map((item) => `${item.label}${item.value}`).join('、');
  const baziOverview = `你填写的是 ${birthDate}。系统按出生年月日排出年柱、月柱、日柱：${knownPillars}。`;

  const faceAnalysis = {
    overview: `简单说，${name}给人的第一感觉偏向：${profile.firstImpression}。`,
    items: [
      { label: '第一印象', value: profile.firstImpression },
      { label: '做事方式', value: profile.workStyle },
      { label: '情绪状态', value: profile.mood },
      { label: '相处方式', value: profile.relationship },
      { label: '提醒', value: profile.advice }
    ]
  };

  const palmAnalysis = {
    overview: `手掌部分主要看做事节奏。当前白话解读是：${profile.palmStyle}。`,
    items: [
      { label: '生命线', value: '重点看精力和节奏，线条越顺，越适合稳稳推进。' },
      { label: '智慧线', value: '重点看思考方式，偏直更务实，略弯更灵活。' },
      { label: '事业线', value: '重点看目标感，越清晰越容易长期坚持。' },
      { label: '感情线', value: '重点看表达方式，讲分寸的人关系通常更稳。' }
    ]
  };

  const baziAnalysis = {
    overview: baziOverview,
    pillars
  };

  const summary = `${name}整体更像一个${profile.firstImpression}的人。做事上适合先定目标，再把步骤拆小；人际上讲分寸会更顺；状态好的时候，事情会推进得很稳。`;
  const confidenceNote = '这是文化娱乐性质的文字解读，不是科学结论，也不代表真实命运。';

  const analysisText = [
    `八字说明：${baziAnalysis.overview}`,
    ...pillars.map((item) => `${item.label}：${item.value}（${item.note}）`),
    '',
    `面相说明：${faceAnalysis.overview}`,
    ...faceAnalysis.items.map((item) => `${item.label}：${item.value}`),
    '',
    `手掌说明：${palmAnalysis.overview}`,
    ...palmAnalysis.items.map((item) => `${item.label}：${item.value}`),
    '',
    `一句话建议：${summary}`,
    confidenceNote
  ].join('\n');

  return {
    baziAnalysis,
    faceAnalysis,
    palmAnalysis,
    summary,
    confidenceNote,
    analysisText
  };
}

router.post('/calculate', calculateUpload, async (req, res, next) => {
  try {
    const { name, birthDate } = req.body;
    const faceImage = req.files?.faceImage?.[0];
    const palmImage = req.files?.palmImage?.[0];
    const faceAudit = parseAuditPayload(req.body.faceAudit);
    const palmAudit = parseAuditPayload(req.body.palmAudit);

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: '请填写姓名。' });
    }

    if (!faceImage || !palmImage) {
      return res.status(400).json({ success: false, message: '请同时上传面部照片与手掌照片。' });
    }

    if (!faceAudit?.ok) {
      return res.status(400).json({ success: false, message: '面部照片未通过识别，请重新上传清晰人脸照片。' });
    }

    if (!palmAudit?.ok) {
      return res.status(400).json({ success: false, message: '手掌照片未通过识别，请重新上传清晰手掌照片。' });
    }

    const parsedBirthDate = parseBirthDate(birthDate);
    const lunar = Lunar.fromDate(parsedBirthDate.date);
    const pillars = buildPillars(lunar);
    const analysis = buildMockAnalysis({ name: name.trim(), birthDate: parsedBirthDate.value, pillars });

    // Future multimodal integration:
    // 1. Use ICE_BINGJIAN_SYSTEM_PROMPT as the system message.
    // 2. Include name, birthDate, and the three pillars generated from the date:
    //    year pillar, month pillar, and day pillar.
    // 3. Include face/palm image URLs or base64 data plus the browser-side audit
    //    results, then ask the model to return the same JSON structure.
    // 4. Replace this mock analysis block with the model response before writing
    //    to the reports table.
    const systemPromptTemplate = ICE_BINGJIAN_SYSTEM_PROMPT;
    void systemPromptTemplate;

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const nowIso = new Date().toISOString();
    const inputJson = {
      name: name.trim(),
      birthDate: parsedBirthDate.value,
      faceImagePath: toPublicUploadPath(faceImage.filename),
      palmImagePath: toPublicUploadPath(palmImage.filename),
      faceAudit,
      palmAudit
    };

    const baziJson = {
      birthDate: parsedBirthDate.value,
      summaryText: analysis.baziAnalysis.overview,
      pillars
    };

    const userResult = execute(
      'INSERT INTO users (display_name, created_at) VALUES (?, ?)',
      [name.trim(), nowIso]
    );

    const reportResult = execute(
      `
      INSERT INTO reports (
        user_id,
        name,
        birth_date,
        face_image_path,
        palm_image_path,
        input_json,
        bazi_json,
        analysis_json,
        analysis_text,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userResult.lastInsertRowid,
        name.trim(),
        parsedBirthDate.value,
        toPublicUploadPath(faceImage.filename),
        toPublicUploadPath(palmImage.filename),
        JSON.stringify(inputJson),
        JSON.stringify(baziJson),
        JSON.stringify({
          baziAnalysis: analysis.baziAnalysis,
          faceAnalysis: analysis.faceAnalysis,
          palmAnalysis: analysis.palmAnalysis,
          summary: analysis.summary,
          confidenceNote: analysis.confidenceNote
        }),
        analysis.analysisText,
        nowIso
      ]
    );

    return res.json({
      success: true,
      data: {
        reportId: reportResult.lastInsertRowid,
        meta: {
          mode: 'mock',
          generatedAt: nowIso,
          elapsedMs: 3000
        },
        input: inputJson,
        bazi: baziJson,
        faceAnalysis: analysis.faceAnalysis,
        palmAnalysis: analysis.palmAnalysis,
        summary: analysis.summary,
        confidenceNote: analysis.confidenceNote,
        analysisText: analysis.analysisText
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
