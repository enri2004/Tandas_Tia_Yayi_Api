export const FRECUENCIAS_TANDA = ["semanal", "quincenal", "mensual"];

const clonarFechaLocal = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const esFechaValida = (date) => date instanceof Date && !Number.isNaN(date.getTime());

export const parseFechaTanda = (fecha) => {
  if (!fecha) {
    return null;
  }

  if (fecha instanceof Date) {
    return esFechaValida(fecha) ? clonarFechaLocal(fecha) : null;
  }

  if (typeof fecha === "string") {
    const valor = fecha.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const [year, month, day] = valor.split("-").map(Number);
      const parsed = new Date(year, month - 1, day);

      if (
        esFechaValida(parsed) &&
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      ) {
        return parsed;
      }

      return null;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      const [day, month, year] = valor.split("/").map(Number);
      const parsed = new Date(year, month - 1, day);

      if (
        esFechaValida(parsed) &&
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      ) {
        return parsed;
      }

      return null;
    }

    const parsed = new Date(valor);
    return esFechaValida(parsed) ? clonarFechaLocal(parsed) : null;
  }

  return null;
};

export const formatearFechaISO = (fecha) => {
  const parsed = parseFechaTanda(fecha);

  if (!parsed) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const sumarFrecuenciaFecha = (fecha, frecuencia, repeticiones = 1) => {
  const base = parseFechaTanda(fecha);

  if (!base) {
    return null;
  }

  const resultado = clonarFechaLocal(base);

  if (frecuencia === "semanal") {
    resultado.setDate(resultado.getDate() + 7 * repeticiones);
  }

  if (frecuencia === "quincenal") {
    resultado.setDate(resultado.getDate() + 15 * repeticiones);
  }

  if (frecuencia === "mensual") {
    resultado.setMonth(resultado.getMonth() + repeticiones);
  }

  return resultado;
};

export const calcularFechaTurno = (fechaInicio, frecuencia, numeroTurno) =>
  formatearFechaISO(sumarFrecuenciaFecha(fechaInicio, frecuencia, numeroTurno));

