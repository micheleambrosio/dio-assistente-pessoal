-- Fixa o search_path de create_bill (advisor function_search_path_mutable).
-- O corpo já usa nomes qualificados (public.*, auth.uid()).
alter function public.create_bill(date, text, numeric, text, smallint, smallint, date, date, text[])
  set search_path = '';
