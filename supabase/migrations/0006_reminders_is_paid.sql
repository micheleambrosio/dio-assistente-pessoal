-- Booleano de Pago com o mesmo nome em todo o banco (ADR 0006: Pago → `isPaid` / `is_paid`),
-- como já é em occurrence_states.
alter table public.reminders rename column paid to is_paid;
