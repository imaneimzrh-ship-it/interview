-- Wire up technical_coding module so exercises table connects to the session flow.
-- Run AFTER 008_exercises.sql

-- 1. Add exercise_id column to interview_sessions so we can track which exercise
--    was assigned to a session (nullable — only set for technical_coding sessions)
ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES public.exercises(id);

-- 2. Insert the technical_coding skill_module + minimal role_track entry
--    The role_track slug must exist — use 'ai_engineer' which should already be there.
--    If not, create it.
INSERT INTO public.role_tracks (slug, name_en, name_fr, display_order)
VALUES ('ai_engineer', 'AI Engineer', 'Ingénieur IA', 99)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.skill_modules (role_track_id, slug, name_en, name_fr, display_order, is_active)
SELECT rt.id, 'technical_coding', 'Technical Coding', 'Exercice pratique', 99, true
FROM public.role_tracks rt WHERE rt.slug = 'ai_engineer'
ON CONFLICT (slug) DO NOTHING;

-- 3. Add a single placeholder sub_skill so the module isn't empty
--    (the real exercise content lives in the exercises table, not questions)
INSERT INTO public.sub_skills (skill_module_id, slug, name_en, name_fr, display_order)
SELECT sm.id, 'coding_exercise', 'Coding Exercise', 'Exercice de codage', 1
FROM public.skill_modules sm WHERE sm.slug = 'technical_coding'
ON CONFLICT (skill_module_id, slug) DO NOTHING;
