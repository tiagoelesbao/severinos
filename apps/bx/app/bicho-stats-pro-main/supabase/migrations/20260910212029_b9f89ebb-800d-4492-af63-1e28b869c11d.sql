CREATE TABLE public.animais (
  grupo smallint PRIMARY KEY,
  nome text NOT NULL,
  dezenas text[] NOT NULL
);
GRANT SELECT ON public.animais TO anon, authenticated;
GRANT ALL ON public.animais TO service_role;
ALTER TABLE public.animais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Animais visiveis para todos" ON public.animais FOR SELECT USING (true);

INSERT INTO public.animais (grupo, nome, dezenas) VALUES
(1,'Avestruz',ARRAY['01','02','03','04']),
(2,'Águia',ARRAY['05','06','07','08']),
(3,'Burro',ARRAY['09','10','11','12']),
(4,'Borboleta',ARRAY['13','14','15','16']),
(5,'Cachorro',ARRAY['17','18','19','20']),
(6,'Cabra',ARRAY['21','22','23','24']),
(7,'Carneiro',ARRAY['25','26','27','28']),
(8,'Camelo',ARRAY['29','30','31','32']),
(9,'Cobra',ARRAY['33','34','35','36']),
(10,'Coelho',ARRAY['37','38','39','40']),
(11,'Cavalo',ARRAY['41','42','43','44']),
(12,'Elefante',ARRAY['45','46','47','48']),
(13,'Galo',ARRAY['49','50','51','52']),
(14,'Gato',ARRAY['53','54','55','56']),
(15,'Jacaré',ARRAY['57','58','59','60']),
(16,'Leão',ARRAY['61','62','63','64']),
(17,'Macaco',ARRAY['65','66','67','68']),
(18,'Porco',ARRAY['69','70','71','72']),
(19,'Pavão',ARRAY['73','74','75','76']),
(20,'Peru',ARRAY['77','78','79','80']),
(21,'Touro',ARRAY['81','82','83','84']),
(22,'Tigre',ARRAY['85','86','87','88']),
(23,'Urso',ARRAY['89','90','91','92']),
(24,'Veado',ARRAY['93','94','95','96']),
(25,'Vaca',ARRAY['97','98','99','00']);

CREATE TABLE public.sorteios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banca text NOT NULL,
  extracao text NOT NULL,
  data_sorteio date NOT NULL,
  premio smallint NOT NULL,
  numero text NOT NULL,
  dezena text NOT NULL,
  grupo smallint NOT NULL REFERENCES public.animais(grupo),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (banca, extracao, data_sorteio, premio)
);
CREATE INDEX sorteios_data_idx ON public.sorteios (data_sorteio DESC);
CREATE INDEX sorteios_grupo_idx ON public.sorteios (grupo);
GRANT SELECT ON public.sorteios TO anon, authenticated;
GRANT ALL ON public.sorteios TO service_role;
ALTER TABLE public.sorteios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sorteios visiveis para todos" ON public.sorteios FOR SELECT USING (true);

CREATE TABLE public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_exibicao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver proprio perfil" ON public.perfis FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Criar proprio perfil" ON public.perfis FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Editar proprio perfil" ON public.perfis FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  grupo smallint NOT NULL REFERENCES public.animais(grupo),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, grupo)
);
GRANT SELECT, INSERT, DELETE ON public.favoritos TO authenticated;
GRANT ALL ON public.favoritos TO service_role;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerenciar proprios favoritos" ON public.favoritos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, nome_exibicao)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome_exibicao', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();