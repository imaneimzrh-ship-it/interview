import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface SubSkill {
  id: string
  slug: string
  name_en: string
  name_fr: string
}

export interface Question {
  id: string
  body_en: string
  body_fr: string
  rubric_strong: string
  rubric_medium: string
  rubric_weak: string
  follow_up_probes: string[]
}

export interface TurnMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Interviewer system prompt ───────────────────────────────────────────────

function buildInterviewerPrompt(
  lang: 'en' | 'fr',
  moduleName: string,
  subSkill: SubSkill,
  question: Question,
  subSkillsCompleted: string[],
  totalSubSkills: number,
  followUpProbes: string[],
  cvExcerpt?: string,
): string {
  const isLast      = subSkillsCompleted.length === totalSubSkills - 1
  const progressNote = `You are on sub-skill ${subSkillsCompleted.length + 1} of ${totalSubSkills} in this module.`
  const cvNote       = cvExcerpt
    ? lang === 'fr'
      ? `\nCV DU CANDIDAT (extrait) : "${cvExcerpt.slice(0, 800)}"\nSi leur réponse contredit ou sous-délivre par rapport à une affirmation du CV, sondez cet écart spécifiquement — de manière encourageante.`
      : `\nCANDIDATE CV (excerpt): "${cvExcerpt.slice(0, 800)}"\nIf their answer contradicts or under-delivers on a claim in the CV, probe that gap specifically — supportively.`
    : ''

  if (lang === 'fr') {
    return `Vous êtes un ingénieur IA senior qui conduit un entretien technique pour un poste d'Ingénieur IA Appliqué, en vous concentrant sur le module : ${moduleName}.

CONTEXTE DE L'ENTRETIEN :
${progressNote}
Compétence actuelle : ${subSkill.name_fr}
Question actuelle : "${question.body_fr}"

RUBRIQUE (privée — NE JAMAIS DIVULGUER) :
Réponse forte : ${question.rubric_strong}
Réponse moyenne : ${question.rubric_medium}
Réponse faible : ${question.rubric_weak}

SONDES DE SUIVI disponibles (utilisez-en UNE si la réponse est superficielle) :
${followUpProbes.map((p, i) => `${i + 1}. ${p}`).join('\n')}
${cvNote}
RÈGLES D'ENTRETIEN :
1. Posez la question actuelle en premier. Ne commencez pas par vous présenter.
2. Après leur réponse, évaluez sa profondeur :
   - Si elle est forte/complète : dites "Merci" puis terminez avec exactement : "[[NEXT]]"
   - Si elle est superficielle/incomplète : posez UNE sonde de suivi (votre choix)
   - Après UNE sonde et leur réponse : terminez avec exactement "[[NEXT]]"
3. Soyez direct, technique et laconique. Pas de compliments. Les vrais intervieweurs sont brefs.
4. Ne JAMAIS révéler la rubrique ou les critères de notation.
5. Poussez en retour sur les affirmations vagues : "Pouvez-vous être plus précis ?"
${isLast ? '6. Après [[NEXT]], ajoutez : "[[COMPLETE]]" — c\'est la dernière question.' : ''}

Commencez maintenant par poser la question.`
  }

  return `You are a senior AI engineer conducting a technical interview for an Applied AI Engineer role, focusing on the module: ${moduleName}.

INTERVIEW CONTEXT:
${progressNote}
Current sub-skill: ${subSkill.name_en}
Current question: "${question.body_en}"

RUBRIC (private — NEVER disclose this):
Strong answer: ${question.rubric_strong}
Medium answer: ${question.rubric_medium}
Weak answer: ${question.rubric_weak}

FOLLOW-UP PROBES available (use ONE if the answer is shallow):
${followUpProbes.map((p, i) => `${i + 1}. ${p}`).join('\n')}
${cvNote}
INTERVIEW RULES:
1. Ask the current question first. Do not introduce yourself.
2. After their answer, assess its depth:
   - If strong/complete: say "Got it." then end with exactly: "[[NEXT]]"
   - If shallow/incomplete: ask ONE follow-up probe (your choice)
   - After ONE probe and their answer: end with exactly "[[NEXT]]"
3. Be direct, technical, and brief. No compliments. Real interviewers are concise.
4. NEVER reveal the rubric or scoring criteria.
5. Push back on hand-wavy claims: "Can you be more specific about that?"
6. React to what they actually said — name the specific gap you're probing.
${isLast ? '7. After [[NEXT]], also add: "[[COMPLETE]]" — this is the last question.' : ''}

Begin now by asking the question.`
}

// ─── Main interview turn function ────────────────────────────────────────────

export async function conductTurn(params: {
  lang: 'en' | 'fr'
  moduleName: string
  subSkill: SubSkill
  question: Question
  history: TurnMessage[]
  userMessage: string
  subSkillsCompleted: string[]
  totalSubSkills: number
  cvExcerpt?: string
}): Promise<{ response: string; shouldAdvance: boolean; isComplete: boolean }> {
  const { lang, moduleName, subSkill, question, history, userMessage, subSkillsCompleted, totalSubSkills, cvExcerpt } = params

  const systemPrompt = buildInterviewerPrompt(
    lang, moduleName, subSkill, question,
    subSkillsCompleted, totalSubSkills, question.follow_up_probes, cvExcerpt,
  )

  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: systemPrompt,
    messages,
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  const shouldAdvance = text.includes('[[NEXT]]')
  const isComplete    = text.includes('[[COMPLETE]]')

  const cleaned = text
    .replace(/\[\[NEXT\]\]/g, '')
    .replace(/\[\[COMPLETE\]\]/g, '')
    .trim()

  return { response: cleaned, shouldAdvance, isComplete }
}

// ─── Opening message (before any user answer) ─────────────────────────────────

export async function openQuestion(params: {
  lang: 'en' | 'fr'
  moduleName: string
  subSkill: SubSkill
  question: Question
  subSkillsCompleted: string[]
  totalSubSkills: number
  cvExcerpt?: string
}): Promise<string> {
  const { lang, moduleName, subSkill, question, subSkillsCompleted, totalSubSkills, cvExcerpt } = params

  const systemPrompt = buildInterviewerPrompt(
    lang, moduleName, subSkill, question,
    subSkillsCompleted, totalSubSkills, question.follow_up_probes, cvExcerpt,
  )

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: 'user', content: lang === 'fr' ? 'Commencez l\'entretien.' : 'Begin the interview.' }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  return text.replace(/\[\[NEXT\]\]/g, '').replace(/\[\[COMPLETE\]\]/g, '').trim()
}

// ─── Ask-Interviewer reverse questions ────────────────────────────────────────

export async function answerCandidateQuestion(params: {
  lang: 'en' | 'fr'
  moduleName: string
  topStrength: string
  topGap: string
  question: string
}): Promise<string> {
  const { lang, moduleName, topStrength, topGap, question } = params

  const system = lang === 'fr'
    ? `Vous venez de terminer un entretien technique sur le module "${moduleName}". Le candidat a maintenant l'occasion de vous poser des questions. Répondez en tant qu'intervieweur senior — honnête, direct, encourageant. Point fort identifié : "${topStrength}". Lacune principale : "${topGap}". Limitez votre réponse à 3-4 phrases.`
    : `You just finished conducting a technical interview on the module "${moduleName}". The candidate now has a chance to ask you questions. Answer as the senior interviewer — honest, direct, encouraging. Identified strength: "${topStrength}". Main gap: "${topGap}". Keep your answer to 3-4 sentences.`

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system,
    messages: [{ role: 'user', content: question }],
  })

  return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
}
