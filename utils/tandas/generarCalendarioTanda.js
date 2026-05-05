const FRECUENCIAS_VALIDAS = ["semanal", "quincenal", "mensual"];

export function sumarFecha(fecha, frecuencia, index) {
  const nueva = new Date(fecha);

  if (frecuencia === "semanal") {
    nueva.setDate(nueva.getDate() + 7 * index);
  }

  if (frecuencia === "quincenal") {
    nueva.setDate(nueva.getDate() + 15 * index);
  }

  if (frecuencia === "mensual") {
    nueva.setMonth(nueva.getMonth() + index);
  }

  return nueva;
}

export function generarCalendarioPagos({
  fechaInicio,
  frecuencia,
  totalPeriodos,
  montoPago,
  integrantes,
}) {
  const frecuenciaNormalizada = FRECUENCIAS_VALIDAS.includes(frecuencia)
    ? frecuencia
    : "quincenal";

  return Array.from({ length: totalPeriodos }, (_, index) => ({
    numeroPago: index + 1,
    fechaPago: sumarFecha(fechaInicio, frecuenciaNormalizada, index),
    monto: Number(montoPago) || 0,
    estado: "pendiente",
    usuariosPagaron: [],
    usuariosPendientes: (integrantes || []).map((id) => id.toString()),
  }));
}

export function generarTurnosCobro({
  fechaInicio,
  frecuencia,
  montoPago,
  integrantes,
}) {
  const frecuenciaNormalizada = FRECUENCIAS_VALIDAS.includes(frecuencia)
    ? frecuencia
    : "quincenal";
  const totalIntegrantes = integrantes.length;

  return integrantes.map((usuarioId, index) => ({
    numeroTurno: index + 1,
    usuarioId,
    fechaCobro: sumarFecha(fechaInicio, frecuenciaNormalizada, index),
    montoARecibir: (Number(montoPago) || 0) * totalIntegrantes,
    estado: "pendiente",
  }));
}

export default {
  sumarFecha,
  generarCalendarioPagos,
  generarTurnosCobro,
};
