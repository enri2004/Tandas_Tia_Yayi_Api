import {
  FRECUENCIAS_TANDA,
  parseFechaTanda,
  sumarFrecuenciaFecha,
} from "../fechas/calcularFechasTanda.js";

const FRECUENCIAS_VALIDAS = FRECUENCIAS_TANDA;

export function sumarFecha(fecha, frecuencia, numeroTurno) {
  return sumarFrecuenciaFecha(fecha, frecuencia, numeroTurno);
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
  const fechaBase = parseFechaTanda(fechaInicio);

  if (!fechaBase) {
    return [];
  }

  return Array.from({ length: totalPeriodos }, (_, index) => ({
    numeroPago: index + 1,
    fechaPago: sumarFecha(fechaBase, frecuenciaNormalizada, index + 1),
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
  const fechaBase = parseFechaTanda(fechaInicio);
  const totalIntegrantes = integrantes.length;

  if (!fechaBase) {
    return [];
  }

  return integrantes.map((usuarioId, index) => ({
    numeroTurno: index + 1,
    usuarioId,
    fechaCobro: sumarFecha(fechaBase, frecuenciaNormalizada, index + 1),
    montoARecibir: (Number(montoPago) || 0) * totalIntegrantes,
    estado: "pendiente",
  }));
}

export default {
  sumarFecha,
  generarCalendarioPagos,
  generarTurnosCobro,
};
