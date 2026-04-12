
-- Athlete profiles
CREATE TABLE public.athlete_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  deporte TEXT,
  fase TEXT,
  peso NUMERIC,
  cmj NUMERIC,
  sj NUMERIC,
  rsi NUMERIC,
  fr NUMERIC,
  w1 NUMERIC,
  w2 NUMERIC,
  fi NUMERIC,
  hero TEXT,
  vehicle TEXT,
  peso_muerto NUMERIC,
  press_banca NUMERIC,
  dominada_lastrada NUMERIC,
  sentadilla_bulgara NUMERIC,
  colgarse NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.athlete_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.athlete_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.athlete_profiles FOR UPDATE USING (true);

-- Athlete tests
CREATE TABLE public.athlete_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_name TEXT NOT NULL REFERENCES public.athlete_profiles(name) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  cmj NUMERIC,
  sj NUMERIC,
  rsi NUMERIC,
  peso NUMERIC,
  fr NUMERIC,
  w1 NUMERIC,
  w2 NUMERIC,
  fi NUMERIC,
  hero TEXT,
  vehicle TEXT,
  peso_muerto_kg NUMERIC,
  peso_muerto_reps NUMERIC,
  peso_muerto_1rm NUMERIC,
  press_banca_kg NUMERIC,
  press_banca_reps NUMERIC,
  press_banca_1rm NUMERIC,
  dominada_lastrada_kg NUMERIC,
  dominada_lastrada_reps NUMERIC,
  dominada_lastrada_1rm NUMERIC,
  sentadilla_bulgara_kg NUMERIC,
  sentadilla_bulgara_reps NUMERIC,
  sentadilla_bulgara_1rm NUMERIC,
  colgarse_segs NUMERIC,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tests" ON public.athlete_tests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tests" ON public.athlete_tests FOR INSERT WITH CHECK (true);

-- Athlete competitions
CREATE TABLE public.athlete_competitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_name TEXT NOT NULL REFERENCES public.athlete_profiles(name) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  fecha DATE NOT NULL,
  rival TEXT,
  resultado TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view competitions" ON public.athlete_competitions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert competitions" ON public.athlete_competitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update competitions" ON public.athlete_competitions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete competitions" ON public.athlete_competitions FOR DELETE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_athlete_profiles_updated_at
  BEFORE UPDATE ON public.athlete_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
