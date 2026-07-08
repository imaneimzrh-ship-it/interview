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

export interface CandidateContext {
  jobDescription?: string
  resume?: string
}

function buildCandidateContextNote(lang: 'en' | 'fr', ctx: CandidateContext): string {
  const jd  = ctx.jobDescription?.trim().slice(0, 600) ?? ''
  const res = ctx.resume?.trim().slice(0, 600) ?? ''
  if (!jd && !res) return ''

  if (lang === 'fr') {
    const parts: string[] = []
    if (jd)  parts.push(`Fiche de poste ciblée : "${jd}"`)
    if (res) parts.push(`Expérience du candidat : "${res}"`)
    return `\nCONTEXTE DU CANDIDAT :
${parts.join('\n')}
INSTRUCTIONS DE PERSONNALISATION :
- Posez la question telle quelle, mais si elle mentionne des outils génériques (ex. "un système RAG", "un outil d'orchestration"), remplacez-les par les technologies concrètes mentionnées dans le contexte ci-dessus (ex. Weaviate, LangGraph, vLLM) si elles sont pertinentes.
- Lors des sondes de suivi, référencez les outils, systèmes ou expériences spécifiques du candidat — ne posez pas de questions génériques si vous pouvez les rendre concrètes.
- Si leur réponse sous-délivre par rapport à une affirmation de leur parcours, sondez cet écart directement.
`
  }

  const parts: string[] = []
  if (jd)  parts.push(`Target job description: "${jd}"`)
  if (res) parts.push(`Candidate background: "${res}"`)
  return `\nCANDIDATE CONTEXT:
${parts.join('\n')}
PERSONALISATION INSTRUCTIONS:
- Ask the current question as written, but if it refers to generic tools (e.g. "a RAG system", "an orchestration tool"), substitute the specific technologies named in the candidate context above (e.g. Weaviate, LangGraph, vLLM) where relevant.
- In follow-up probes, reference the candidate's specific tools, systems, or claimed experience — don't ask generic questions when you can make them concrete.
- If their answer under-delivers on a claim in their background, probe that gap directly.
`
}

function buildInterviewerPrompt(
  lang: 'en' | 'fr',
  moduleName: string,
  subSkill: SubSkill,
  question: Question,
  subSkillsCompleted: string[],
  totalSubSkills: number,
  followUpProbes: string[],
  candidateCtx?: CandidateContext,
): string {
  const isLast      = subSkillsCompleted.length === totalSubSkills - 1
  const progressNote = `You are on sub-skill ${subSkillsCompleted.length + 1} of ${totalSubSkills} in this module.`
  const ctxNote      = candidateCtx ? buildCandidateContextNote(lang, candidateCtx) : ''

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
${ctxNote}
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
${ctxNote}
INTERVIEW RULES:
1. Ask the current question as written, but personalise it with the candidate's specific tools/stack from the context above — make it concrete, not generic.
2. After their answer, assess two things independently — technical depth AND trade-off reasoning:
   - If strong on both: say "Got it." then end with exactly: "[[NEXT]]"
   - If technically correct but trade-off-free (never explained WHY over alternatives): probe directly — "Why [their choice] over [the obvious alternative]?" Examples: "Why RAG over fine-tuning here?", "Why HNSW over a flat index at this scale?", "Why LLM-as-judge rather than human eval in this case?", "Why vLLM over TGI for your inference setup?"
   - If shallow on technical content: ask ONE follow-up probe (your choice)
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
  candidateCtx?: CandidateContext
}): Promise<{ response: string; shouldAdvance: boolean; isComplete: boolean }> {
  const { lang, moduleName, subSkill, question, history, userMessage, subSkillsCompleted, totalSubSkills, candidateCtx } = params

  const systemPrompt = buildInterviewerPrompt(
    lang, moduleName, subSkill, question,
    subSkillsCompleted, totalSubSkills, question.follow_up_probes, candidateCtx,
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
  candidateCtx?: CandidateContext
}): Promise<string> {
  const { lang, moduleName, subSkill, question, subSkillsCompleted, totalSubSkills, candidateCtx } = params

  const systemPrompt = buildInterviewerPrompt(
    lang, moduleName, subSkill, question,
    subSkillsCompleted, totalSubSkills, question.follow_up_probes, candidateCtx,
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
