export const DIAS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export type HorarioDia = { diaSemana: number; abre: boolean; horarioInicio: string; horarioFim: string };

export function horarioPadraoDoDia(dia: number): HorarioDia {
  return {
    diaSemana: dia,
    abre: dia >= 1 && dia <= 5,
    horarioInicio: "08:00",
    horarioFim: "18:00",
  };
}
