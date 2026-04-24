import mongoose from "mongoose";
import Tandas_model from "../models/Tandas_models.js";
import { Cloudinary_Subir } from "../utils/cloudinary.js";
import cloudinary from "../config/cloudinary.js";
import UserModel from "../models/User_models.js";
import NotiModel from "../models/Noti_models.js";
import ComprobanteModel from "../models/Comprobante_models.js";
import HistorialModel from "../models/Historial_models.js";
import { crearNotificacionYHistorial } from "../utils/notificationService.js";

const parseFechaTanda = (valor) => {
  if (!valor) {
    return null;
  }

  const directa = new Date(valor);
  if (!Number.isNaN(directa.getTime())) {
    return directa;
  }

  if (typeof valor === "string") {
    const partes = valor.split(/[\/\-]/).map((item) => item.trim());
    if (partes.length === 3) {
      const [primero, segundo, tercero] = partes.map(Number);
      if ([primero, segundo, tercero].every((item) => !Number.isNaN(item))) {
        const fecha = new Date(tercero, segundo - 1, primero);
        if (!Number.isNaN(fecha.getTime())) {
          return fecha;
        }
      }
    }
  }

  return null;
};

const formatearFechaISO = (fecha) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    return "";
  }

  return fecha.toISOString().split("T")[0];
};

const sumarFrecuencia = (fechaBase, frecuencia = "quincenal", pasos = 0) => {
  const fecha = new Date(fechaBase);

  if (frecuencia === "semanal") {
    fecha.setDate(fecha.getDate() + pasos * 7);
    return fecha;
  }

  if (frecuencia === "mensual") {
    fecha.setMonth(fecha.getMonth() + pasos);
    return fecha;
  }

  fecha.setDate(fecha.getDate() + pasos * 14);
  return fecha;
};

const construirTurnos = ({
  integrantes = [],
  fecha,
  frecuencia = "quincenal",
  pagoRealizados = 0,
  estadosPorUsuario = new Map(),
}) => {
  const fechaBase = parseFechaTanda(fecha);

  if (!fechaBase) {
    return [];
  }

  return integrantes.map((usuarioId, index) => ({
    usuario: usuarioId,
    orden: index + 1,
    fechaProgramada: formatearFechaISO(
      sumarFrecuencia(fechaBase, frecuencia, index)
    ),
    estadoPago:
      estadosPorUsuario.get(usuarioId?.toString?.() || usuarioId) ||
      (index < Number(pagoRealizados || 0) ? "pagado" : "pendiente"),
  }));
};

const mezclarIds = (ids = []) => {
  const copia = [...ids];
  for (let index = copia.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copia[index], copia[randomIndex]] = [copia[randomIndex], copia[index]];
  }
  return copia;
};

const obtenerEstadosTurnosPorUsuario = (turnos = []) => {
  const estados = new Map();
  turnos.forEach((turno) => {
    const usuarioId = turno?.usuario?._id?.toString?.() || turno?.usuario?.toString?.();
    if (usuarioId) {
      estados.set(usuarioId, turno.estadoPago || "pendiente");
    }
  });
  return estados;
};

const obtenerIdUsuarioTurno = (turno) =>
  turno?.usuario?._id?.toString?.() ||
  turno?.usuario?.toString?.() ||
  "";

const obtenerTurnoDeUsuario = (turnos = [], userId = "") =>
  Array.isArray(turnos)
    ? turnos.find((turno) => obtenerIdUsuarioTurno(turno) === userId.toString())
    : null;

const generarCodigoInvitacion = (nombre = "") => {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4);

  const sufijo = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${base || "TANDA"}-${sufijo}`;
};

const obtenerCodigoUnicoTanda = async (nombre = "") => {
  let codigo = generarCodigoInvitacion(nombre);
  let existe = await Tandas_model.findOne({ codigoInvitacion: codigo }).select("_id");

  while (existe) {
    codigo = generarCodigoInvitacion(nombre);
    existe = await Tandas_model.findOne({ codigoInvitacion: codigo }).select("_id");
  }

  return codigo;
};

const construirEstadoTanda = ({ tanda, fechaPago, ultimoComprobante }) => {
  if (tanda.estado === false) {
    return "Finalizada";
  }

  if (ultimoComprobante?.estado === "pendiente") {
    return "Pago en revision";
  }

  if (ultimoComprobante?.estado === "rechazado") {
    return "Pago rechazado";
  }

  if (fechaPago) {
    return `Proximo pago ${fechaPago.toISOString()}`;
  }

  return "Activa";
};

const enriquecerTandasAdmin = ({ tandas = [], adminId = "", comprobantes = [] }) => {
  const comprobantesPorTanda = new Map();

  comprobantes.forEach((comprobante) => {
    const tandaId = comprobante.tanda?.toString?.() || comprobante.tanda?._id?.toString?.();
    if (!tandaId) {
      return;
    }

    if (!comprobantesPorTanda.has(tandaId)) {
      comprobantesPorTanda.set(tandaId, []);
    }

    comprobantesPorTanda.get(tandaId).push(comprobante);
  });

  return tandas.map((tanda) => {
    const comprobantesTanda = comprobantesPorTanda.get(tanda._id.toString()) || [];
    const totalIntegrantes = Array.isArray(tanda.integrantes) ? tanda.integrantes.length : 0;
    const pagosPendientes = comprobantesTanda.filter((item) => item.estado === "pendiente").length;
    const pagosAprobados = comprobantesTanda.filter((item) => item.estado === "aprobado").length;
    const pagosRechazados = comprobantesTanda.filter((item) => item.estado === "rechazado").length;
    const pagoPorPersona = Number(tanda.pago) || 0;
    const pagoRealizados = Number(tanda.pagoRealizados) || 0;
    const totalEsperado = pagoPorPersona * (Number(tanda.participantes) || 0);
    const totalRecaudado = pagoRealizados * pagoPorPersona;

    return {
      _id: tanda._id,
      nombre: tanda.nombre,
      descripcion: tanda.descripcion || "",
      codigoInvitacion: tanda.codigoInvitacion || "",
      pago: pagoPorPersona,
      participantes: Number(tanda.participantes) || 0,
      fecha: tanda.fecha || "",
      frecuencia: tanda.frecuencia || "quincenal",
      imagen: tanda.imagen || "",
      estado: tanda.estado,
      estadoTexto: tanda.estado === false ? "Finalizada" : "Activa",
      pagoRealizados,
      totalIntegrantes,
      totalEsperado,
      totalRecaudado,
      comprobantesPendientes: pagosPendientes,
      comprobantesAprobados: pagosAprobados,
      comprobantesRechazados: pagosRechazados,
      creador: tanda.creador,
      turnos: (tanda.turnos || []).map((turno) => ({
        usuario: turno?.usuario?._id || turno?.usuario,
        nombre: turno?.usuario?.nombre || "",
        correo: turno?.usuario?.correo || "",
        imagen: turno?.usuario?.imagen || "",
        orden: turno?.orden || 0,
        fechaProgramada: turno?.fechaProgramada || "",
        estadoPago: turno?.estadoPago || "pendiente",
      })),
      integrantes: (tanda.integrantes || []).map((integrante, index) => ({
        _id: integrante?._id || integrante,
        nombre: integrante?.nombre || "Integrante",
        correo: integrante?.correo || "",
        imagen: integrante?.imagen || "",
        turno: index + 1,
      })),
    };
  });
};

export const ObtenerTandasPorAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        mensaje: "Id de administrador invalido",
      });
    }

    if (!authId || authId.toString() !== adminId.toString()) {
      return res.status(403).json({
        mensaje: "No tienes permiso para consultar estas tandas",
      });
    }

    if (authRol !== "admin") {
      return res.status(403).json({
        mensaje: "Solo un administrador puede consultar este listado",
      });
    }

    const tandas = await Tandas_model.find({ creador: adminId })
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen")
      .sort({ createdAt: -1 });

    const comprobantes = await ComprobanteModel.find({
      tanda: { $in: tandas.map((item) => item._id) },
    }).select("tanda estado monto createdAt");

    res.status(200).json(
      enriquecerTandasAdmin({
        tandas,
        adminId,
        comprobantes,
      })
    );
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener las tandas del administrador",
      detalles: error.message,
    });
  }
};

export const ObtenerResumenDashboardAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        mensaje: "Id de administrador invalido",
      });
    }

    if (!authId || authId.toString() !== adminId.toString()) {
      return res.status(403).json({
        mensaje: "No tienes permiso para consultar este resumen",
      });
    }

    if (authRol !== "admin") {
      return res.status(403).json({
        mensaje: "Solo un administrador puede consultar este resumen",
      });
    }

    const admin = await UserModel.findById(adminId).select(
      "nombre correo usuario imagen rol tipoUsuario"
    );

    if (!admin) {
      return res.status(404).json({
        mensaje: "Administrador no encontrado",
      });
    }

    const tandas = await Tandas_model.find({ creador: adminId })
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen")
      .sort({ createdAt: -1 });

    const tandaIds = tandas.map((item) => item._id);

    const [comprobantes, notificacionesSinLeer, actividadReciente] = await Promise.all([
      ComprobanteModel.find({
        tanda: { $in: tandaIds },
      })
        .populate("usuario", "nombre correo")
        .populate("tanda", "nombre")
        .sort({ createdAt: -1 }),
      NotiModel.countDocuments({
        usuario: adminId,
        leida: false,
      }),
      HistorialModel.find({
        tanda: { $in: tandaIds },
      })
        .populate("usuario", "nombre correo")
        .populate("actor", "nombre correo")
        .populate("tanda", "nombre")
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    const tandasEnriquecidas = enriquecerTandasAdmin({
      tandas,
      adminId,
      comprobantes,
    });

    const totalParticipantes = tandasEnriquecidas.reduce(
      (acc, item) => acc + item.totalIntegrantes,
      0
    );
    const tandasActivas = tandasEnriquecidas.filter((item) => item.estado !== false);
    const tandasFinalizadas = tandasEnriquecidas.filter((item) => item.estado === false);
    const pagosPendientes = comprobantes.filter((item) => item.estado === "pendiente").length;
    const pagosCompletos = comprobantes.filter((item) => item.estado === "aprobado").length;
    const comprobantesPorRevisar = pagosPendientes;
    const dineroRecaudado = tandasEnriquecidas.reduce(
      (acc, item) => acc + item.totalRecaudado,
      0
    );
    const totalEsperado = tandasEnriquecidas.reduce(
      (acc, item) => acc + item.totalEsperado,
      0
    );

    res.status(200).json({
      admin: {
        id: admin._id,
        nombre: admin.nombre,
        correo: admin.correo,
        usuario: admin.usuario,
        imagen: admin.imagen,
        rol: admin.rol,
        tipoUsuario: admin.tipoUsuario,
      },
      resumen: {
        tandasActivas: tandasActivas.length,
        tandasFinalizadas: tandasFinalizadas.length,
        totalTandas: tandasEnriquecidas.length,
        totalParticipantes,
        pagosPendientes,
        pagosCompletos,
        comprobantesPorRevisar,
        notificacionesSinLeer,
        dineroRecaudado,
        totalEsperado,
      },
      tandas: tandasEnriquecidas,
      actividadReciente: actividadReciente.map((item) => ({
        _id: item._id,
        tipo: item.tipo,
        titulo: item.titulo,
        descripcion: item.descripcion,
        createdAt: item.createdAt,
        tanda: item.tanda
          ? {
              _id: item.tanda._id,
              nombre: item.tanda.nombre,
            }
          : null,
        usuario: item.usuario
          ? {
              _id: item.usuario._id,
              nombre: item.usuario.nombre,
              correo: item.usuario.correo,
            }
          : null,
        actor: item.actor
          ? {
              _id: item.actor._id,
              nombre: item.actor.nombre,
              correo: item.actor.correo,
            }
          : null,
      })),
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener el resumen administrativo",
      detalles: error.message,
    });
  }
};

export const ObtenerDatos = async (req, res) => {
  try {
    const obtenerDatos = await Tandas_model.find();
    res.json(obtenerDatos);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      menssage: "Error al obtener la tanda",
      detalles: error.message,
    });
  }
};

export const ObtenerTandaPorId = async (req, res) => {
  try {
    const tanda = await Tandas_model.findById(req.params.id)
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen");
    if (!tanda) {
      return res.status(404).json({
        mensaje: "Tanda no encontrada",
      });
    }

    res.json(tanda);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "Error al obtener la tanda",
      detalles: error.message,
    });
  }
};

export const ObtenerTandaPorCodigo = async (req, res) => {
  try {
    const codigo = String(req.params.codigo || "").trim().toUpperCase();

    if (!codigo) {
      return res.status(400).json({
        mensaje: "El codigo de invitacion es obligatorio",
      });
    }

    const tanda = await Tandas_model.findOne({ codigoInvitacion: codigo })
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen");

    if (!tanda) {
      return res.status(404).json({
        mensaje: "No se encontro una tanda con ese codigo",
      });
    }

    return res.status(200).json(tanda);
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al buscar la tanda por codigo",
      detalles: error.message,
    });
  }
};

export const NuevaTanda = async (req, res) => {
  try {
    let imagen = "";
    let public_id = "";

    if (req.file) {
      const result = await Cloudinary_Subir(req.file);
      imagen = result.url;
      public_id = result.public_id;
    }

    const {
      nombre,
      pago,
      participantes,
      fecha,
      frecuencia,
      descripcion,
      pagoRealizados,
      turno,
      estado,
      creador,
      integrantes,
    } = req.body;
    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (!nombre || !pago || !participantes || !fecha || !creador) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(creador)) {
      return res.status(400).json({
        mensaje: "Id de creador invalido",
      });
    }

    if (!authId || authId.toString() !== creador.toString()) {
      return res.status(403).json({
        mensaje: "El usuario autenticado no coincide con el creador enviado",
      });
    }

    if (authRol !== "admin") {
      return res.status(403).json({
        mensaje: "Solo un administrador puede crear tandas",
      });
    }

    const pagoNumero = Number(pago);
    const participantesNumero = Number(participantes);

    if (Number.isNaN(pagoNumero) || pagoNumero <= 0) {
      return res.status(400).json({
        mensaje: "El monto de pago debe ser mayor a cero",
      });
    }

    if (
      Number.isNaN(participantesNumero) ||
      participantesNumero <= 0 ||
      !Number.isInteger(participantesNumero)
    ) {
      return res.status(400).json({
        mensaje: "El numero de participantes debe ser un entero mayor a cero",
      });
    }

    let integrantesRecibidos = [];

    if (Array.isArray(integrantes)) {
      integrantesRecibidos = integrantes;
    } else if (typeof integrantes === "string" && integrantes.trim()) {
      try {
        integrantesRecibidos = JSON.parse(integrantes);
      } catch (jsonError) {
        return res.status(400).json({
          mensaje: "El formato de integrantes no es valido",
        });
      }
    }

    const integrantesConCreador = [...integrantesRecibidos.map((item) => item?.toString?.() || item), creador];
    const integrantesSinDuplicados = [...new Set(integrantesConCreador.filter(Boolean))];

    if (integrantesSinDuplicados.length > participantesNumero) {
      return res.status(400).json({
        mensaje: "La cantidad de integrantes seleccionados supera el limite de participantes",
      });
    }

    const idsInvalidos = integrantesSinDuplicados.some(
      (item) => !mongoose.Types.ObjectId.isValid(item)
    );

    if (idsInvalidos) {
      return res.status(400).json({
        mensaje: "Uno o mas integrantes tienen un id invalido",
      });
    }

    const usuariosIntegrantes = await UserModel.find({
      _id: { $in: integrantesSinDuplicados },
    }).select("_id nombre correo");

    if (usuariosIntegrantes.length !== integrantesSinDuplicados.length) {
      return res.status(404).json({
        mensaje: "Uno o mas integrantes no existen",
      });
    }

    const codigoInvitacion = await obtenerCodigoUnicoTanda(nombre);

    const tandaCompleta = integrantesSinDuplicados.length === participantesNumero;

    const nuevaTanda = new Tandas_model({
      nombre,
      pago: pagoNumero,
      participantes: participantesNumero,
      fecha,
      frecuencia: frecuencia || "quincenal",
      descripcion: descripcion || "",
      codigoInvitacion,
      pagoRealizados: Number(pagoRealizados) || 0,
      turno: Number(turno) || 1,
      estado: typeof estado === "boolean" ? estado : true,
      creador,
      integrantes: integrantesSinDuplicados,
      turnos: tandaCompleta
        ? construirTurnos({
            integrantes: integrantesSinDuplicados,
            fecha,
            frecuencia: frecuencia || "quincenal",
            pagoRealizados: Number(pagoRealizados) || 0,
          })
        : [],
      imagen,
      public_id,
    });

    await nuevaTanda.save();

    await crearNotificacionYHistorial({
      userIds: integrantesSinDuplicados.filter(
        (integranteId) => integranteId.toString() !== creador.toString()
      ),
      tandaId: nuevaTanda._id,
      usuarioId: creador,
      actorId: creador,
      tipo: "integrante_agregado",
      origen: "evento",
      titulo: "Nueva tanda creada",
      texto: `Fuiste agregado a la tanda ${nombre}.`,
      detalles: "Revisa la nueva tanda en tu panel.",
      metadata: {
        evento: "tanda_creada",
        frecuencia: frecuencia || "quincenal",
      },
    });

    res.status(201).json({
      mensaje: "Tanda creada correctamente",
      tanda: await Tandas_model.findById(nuevaTanda._id)
        .populate("creador", "nombre correo imagen")
        .populate("integrantes", "nombre correo imagen")
        .populate("turnos.usuario", "nombre correo imagen"),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "Error al guardar la tanda",
      detalles: error.message,
    });
  }
};

export const UnirseATanda = async (req, res) => {
  try {
    const { id } = req.params;
    const userIdBody = req.body?.userId;
    const userIdToken = req.usuario?.id;
    const userId = userIdBody || userIdToken;

    if (!userId) {
      return res.status(400).json({
        mensaje: "El userId es obligatorio",
      });
    }

    if (
      userIdBody &&
      userIdToken &&
      userIdBody.toString() !== userIdToken.toString()
    ) {
      return res.status(403).json({
        mensaje: "El usuario autenticado no coincide con el userId enviado",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        mensaje: "Id de tanda o usuario invalido",
      });
    }

    const [tanda, usuario] = await Promise.all([
      Tandas_model.findById(id),
      UserModel.findById(userId).select("nombre correo"),
    ]);

    if (!tanda) {
      return res.status(404).json({
        mensaje: "Tanda no encontrada",
      });
    }

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    const yaEsta = tanda.integrantes.some(
      (item) => item.toString() === userId
    );

    if (yaEsta) {
      return res.status(400).json({
        mensaje: "El usuario ya pertenece a esta tanda",
      });
    }

    if (tanda.integrantes.length >= tanda.participantes) {
      return res.status(400).json({
        mensaje: "La tanda ya no tiene lugares disponibles",
      });
    }

    tanda.integrantes.push(userId);
    tanda.turnos =
      tanda.integrantes.length === Number(tanda.participantes || 0)
        ? construirTurnos({
            integrantes: tanda.integrantes,
            fecha: tanda.fecha,
            frecuencia: tanda.frecuencia || "quincenal",
            pagoRealizados: tanda.pagoRealizados || 0,
            estadosPorUsuario: obtenerEstadosTurnosPorUsuario(tanda.turnos || []),
          })
        : [];
    await tanda.save();

    const tandaActualizada = await Tandas_model.findById(id)
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen");

    await crearNotificacionYHistorial({
      target: "admins",
      tandaId: tanda._id,
      usuarioId: userId,
      actorId: userId,
      tipo: "usuario_unido",
      origen: "evento",
      titulo: "Nuevo integrante agregado",
      texto: `${usuario?.nombre || "Un usuario"} se unio a la tanda ${tanda.nombre}.`,
      detalles: "Revisa la lista de integrantes actualizada.",
      metadata: {
        integranteId: userId,
        evento: "nuevo_integrante_unido",
        prepararNotificacion: true,
      },
    });

    res.status(200).json({
      mensaje: "Te uniste a la tanda correctamente",
      tanda: tandaActualizada,
      totalIntegrantes: tandaActualizada?.integrantes?.length || 0,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al unirse a la tanda",
      detalles: error.message,
    });
  }
};

export const AsignarTurnosTanda = async (req, res) => {
  try {
    const { id } = req.params;
    const { integrantesOrdenados = [], aleatorio = false } = req.body;
    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        mensaje: "Id de tanda invalido",
      });
    }

    const tanda = await Tandas_model.findById(id);

    if (!tanda) {
      return res.status(404).json({
        mensaje: "Tanda no encontrada",
      });
    }

    if (
      authRol !== "admin" ||
      !authId ||
      tanda.creador?.toString() !== authId.toString()
    ) {
      return res.status(403).json({
        mensaje: "No tienes permiso para asignar turnos de esta tanda",
      });
    }

    const integrantesActuales = (tanda.integrantes || []).map((item) => item.toString());

    if (integrantesActuales.length !== Number(tanda.participantes || 0)) {
      return res.status(400).json({
        mensaje: "La tanda debe tener todos los integrantes antes de asignar turnos",
      });
    }

    const ordenRecibido = Array.isArray(integrantesOrdenados)
      ? integrantesOrdenados.map((item) => item?.toString?.() || item).filter(Boolean)
      : [];

    const ordenFinal = aleatorio ? mezclarIds(integrantesActuales) : ordenRecibido;

    if (ordenFinal.length !== integrantesActuales.length) {
      return res.status(400).json({
        mensaje: "El orden de turnos debe incluir a todos los integrantes",
      });
    }

    const idsUnicos = new Set(ordenFinal);
    const mismosIntegrantes =
      idsUnicos.size === integrantesActuales.length &&
      integrantesActuales.every((integranteId) => idsUnicos.has(integranteId));

    if (!mismosIntegrantes) {
      return res.status(400).json({
        mensaje: "El orden enviado no coincide con los integrantes actuales de la tanda",
      });
    }

    tanda.integrantes = ordenFinal;
    tanda.turnos = construirTurnos({
      integrantes: ordenFinal,
      fecha: tanda.fecha,
      frecuencia: tanda.frecuencia || "quincenal",
      pagoRealizados: tanda.pagoRealizados || 0,
      estadosPorUsuario: obtenerEstadosTurnosPorUsuario(tanda.turnos || []),
    });

    await tanda.save();

    const tandaActualizada = await Tandas_model.findById(id)
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen");

    await crearNotificacionYHistorial({
      userIds: ordenFinal,
      tandaId: tanda._id,
      usuarioId: authId,
      actorId: authId,
      tipo: "turnos_asignados",
      origen: "evento",
      titulo: "Turnos actualizados",
      texto: `Se actualizaron los turnos de la tanda ${tanda.nombre}.`,
      detalles: "Consulta tu turno y fecha programada desde el detalle de la tanda.",
      metadata: {
        evento: "turnos_asignados",
        aleatorio,
      },
    });

    return res.status(200).json({
      mensaje: aleatorio
        ? "Turnos asignados aleatoriamente"
        : "Turnos asignados correctamente",
      tanda: tandaActualizada,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "No se pudieron asignar los turnos",
      detalles: error.message,
    });
  }
};

export const UnirseATandaPorCodigo = async (req, res) => {
  try {
    const codigo = String(req.params.codigo || "").trim().toUpperCase();

    if (!codigo) {
      return res.status(400).json({
        mensaje: "El codigo de invitacion es obligatorio",
      });
    }

    const tanda = await Tandas_model.findOne({ codigoInvitacion: codigo }).select("_id");

    if (!tanda) {
      return res.status(404).json({
        mensaje: "No se encontro una tanda con ese codigo",
      });
    }

    req.params.id = tanda._id.toString();
    return UnirseATanda(req, res);
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al unirse a la tanda por codigo",
      detalles: error.message,
    });
  }
};

export const ObtenerTandasPorUsuario = async (req, res) => {
  try {
    const { userId } = req.params;

    const tandas = await Tandas_model.find({
      integrantes: userId,
    })
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen");

    res.status(200).json(
      tandas.map((tanda) => {
        const turnoActual = obtenerTurnoDeUsuario(tanda.turnos, userId);

        return {
          ...tanda.toObject(),
          turnoUsuario: turnoActual?.orden || null,
          fechaTurnoUsuario: turnoActual?.fechaProgramada || "",
          estadoPagoTurno: turnoActual?.estadoPago || "pendiente",
        };
      })
    );
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener las tandas del usuario",
      detalles: error.message,
    });
  }
};

export const ObtenerResumenDashboardUsuario = async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdToken = req.usuario?.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        mensaje: "Id de usuario invalido",
      });
    }

    if (
      userIdToken &&
      req.usuario?.rol !== "admin" &&
      userId.toString() !== userIdToken.toString()
    ) {
      return res.status(403).json({
        mensaje: "No tienes permiso para consultar este resumen",
      });
    }

    const usuario = await UserModel.findById(userId).select(
      "nombre correo usuario imagen rol tipoUsuario"
    );

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    const tandas = await Tandas_model.find({
      integrantes: userId,
    })
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen");

    const tandaIds = tandas.map((item) => item._id);

    const [notificacionesSinLeer, comprobantes] = await Promise.all([
      NotiModel.countDocuments({
        usuario: userId,
        leida: false,
      }),
      ComprobanteModel.find({
        usuario: userId,
        tanda: { $in: tandaIds },
      }).sort({ createdAt: -1 }),
    ]);

    const comprobantePorTanda = new Map();
    comprobantes.forEach((item) => {
      const tandaId = item.tanda?.toString();
      if (tandaId && !comprobantePorTanda.has(tandaId)) {
        comprobantePorTanda.set(tandaId, item);
      }
    });

    const hoy = new Date();

    const tandasEnriquecidas = tandas.map((tanda) => {
      const fechaPago = parseFechaTanda(tanda.fecha);
      const ultimoComprobante = comprobantePorTanda.get(tanda._id.toString()) || null;
      const integrantes = Array.isArray(tanda.integrantes) ? tanda.integrantes : [];
      const turnoActual = obtenerTurnoDeUsuario(tanda.turnos, userId);
      const turnoUsuario = turnoActual?.orden || null;
      const montoRecibir = (Number(tanda.pago) || 0) * (Number(tanda.participantes) || 0);

      return {
        _id: tanda._id,
        nombre: tanda.nombre,
        estado: tanda.estado,
        estadoTexto: construirEstadoTanda({
          tanda,
          fechaPago,
          ultimoComprobante,
        }),
        fecha: tanda.fecha || "",
        fechaPagoDate: fechaPago,
        pago: Number(tanda.pago) || 0,
        participantes: Number(tanda.participantes) || 0,
        turnoUsuario: turnoUsuario > 0 ? turnoUsuario : null,
        fechaTurnoUsuario: turnoActual?.fechaProgramada || "",
        estadoPagoTurno: turnoActual?.estadoPago || "pendiente",
        montoRecibir,
      };
    });

    const tandasActivas = tandasEnriquecidas.filter((item) => item.estado !== false);

    const proximoPago =
      tandasActivas
        .filter((item) => item.fechaPagoDate)
        .sort((a, b) => {
          const aDiff = a.fechaPagoDate >= hoy ? 0 : 1;
          const bDiff = b.fechaPagoDate >= hoy ? 0 : 1;
          if (aDiff !== bDiff) {
            return aDiff - bDiff;
          }
          return a.fechaPagoDate - b.fechaPagoDate;
        })[0] ||
      tandasActivas[0] ||
      null;

    const proximoTurno =
      tandasActivas
        .filter((item) => item.turnoUsuario)
        .sort((a, b) => a.turnoUsuario - b.turnoUsuario)[0] || null;

    res.status(200).json({
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        usuario: usuario.usuario,
        imagen: usuario.imagen,
        rol: usuario.rol,
        tipoUsuario: usuario.tipoUsuario,
      },
      resumen: {
        tandasActivas: tandasActivas.length,
        notificacionesSinLeer,
        proximoPago: proximoPago
          ? {
              tandaId: proximoPago._id,
              nombreTanda: proximoPago.nombre,
              monto: proximoPago.pago,
              fechaLimite: proximoPago.fechaTurnoUsuario || proximoPago.fecha || "",
            }
          : null,
        proximoTurno: proximoTurno
          ? {
              tandaId: proximoTurno._id,
              nombreTanda: proximoTurno.nombre,
              numeroTurno: proximoTurno.turnoUsuario,
              montoRecibir: proximoTurno.montoRecibir,
            }
          : null,
      },
      misTandas: tandasEnriquecidas.map((item) => ({
        _id: item._id,
        nombre: item.nombre,
        estado: item.estado,
        estadoTexto: item.estadoTexto,
        fecha: item.fecha,
        pago: item.pago,
        pagoRealizados: tandas.find((tanda) => tanda._id.toString() === item._id.toString())?.pagoRealizados || 0,
        participantes: item.participantes,
        turnoUsuario: item.turnoUsuario,
        fechaTurnoUsuario: item.fechaTurnoUsuario,
        estadoPagoTurno: item.estadoPagoTurno,
        montoRecibir: item.montoRecibir,
      })),
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener el resumen del dashboard",
      detalles: error.message,
    });
  }
};

export const putTanda = async (req, res) => {
  try {
    const tandaActual = await Tandas_model.findById(req.params.id);

    if (!tandaActual) {
      return res.status(404).json({
        mensaje: "No se encuentra la tanda",
      });
    }

    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (
      authRol !== "admin" ||
      !authId ||
      tandaActual.creador?.toString() !== authId.toString()
    ) {
      return res.status(403).json({
        mensaje: "No tienes permiso para actualizar esta tanda",
      });
    }

    const ActualizarTanda = await Tandas_model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!ActualizarTanda) {
      return res.status(404).json({
        mensaje: "No se encuentra la tanda",
      });
    }

    res.json(ActualizarTanda);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se actualizaron los datos",
    });
  }
};

export const deleteTanda = async (req, res) => {
  try {
    const tandaActual = await Tandas_model.findById(req.params.id);

    if (!tandaActual) {
      return res.status(404).json({
        mensaje: "No se encuentra la tanda",
      });
    }

    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (
      authRol !== "admin" ||
      !authId ||
      tandaActual.creador?.toString() !== authId.toString()
    ) {
      return res.status(403).json({
        mensaje: "No tienes permiso para eliminar esta tanda",
      });
    }

    const EliminarTanda = await Tandas_model.findByIdAndDelete(req.params.id);
    res.json(EliminarTanda);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se eliminan los datos",
    });
  }
};

export const FinalizarTanda = async (req, res) => {
  try {
    const tanda = await Tandas_model.findById(req.params.id);

    if (!tanda) {
      return res.status(404).json({
        mensaje: "No se encuentra la tanda",
      });
    }

    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (
      authRol !== "admin" ||
      !authId ||
      tanda.creador?.toString() !== authId.toString()
    ) {
      return res.status(403).json({
        mensaje: "No tienes permiso para finalizar esta tanda",
      });
    }

    if (tanda.estado === false) {
      return res.status(400).json({
        mensaje: "La tanda ya estaba finalizada",
      });
    }

    tanda.estado = false;
    await tanda.save();

    await crearNotificacionYHistorial({
      userIds: (tanda.integrantes || []).map((item) => item.toString()),
      tandaId: tanda._id,
      usuarioId: authId,
      actorId: authId,
      tipo: "tanda_finalizada",
      origen: "evento",
      titulo: "Tanda finalizada",
      texto: `La tanda ${tanda.nombre} fue finalizada por su administrador.`,
      detalles: "Consulta el estado final desde tu panel.",
      metadata: {
        evento: "tanda_finalizada",
      },
    });

    const tandaActualizada = await Tandas_model.findById(req.params.id)
      .populate("creador", "nombre correo imagen")
      .populate("integrantes", "nombre correo imagen")
      .populate("turnos.usuario", "nombre correo imagen");

    res.json({
      mensaje: "Tanda finalizada correctamente",
      tanda: tandaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo finalizar la tanda",
      detalle: error.message,
    });
  }
};
