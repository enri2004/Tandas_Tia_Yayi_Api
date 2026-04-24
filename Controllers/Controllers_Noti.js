import NotiModel from "../models/Noti_models.js";
import { crearNotificaciones, obtenerUsuariosObjetivo } from "../utils/notificationService.js";

const puedeUsarNotificacion = (req, usuarioId) => {
  if (!req.usuario?.id) {
    return false;
  }

  return (
    req.usuario.rol === "admin" ||
    req.usuario.id.toString() === usuarioId?.toString()
  );
};

export const NuevaNoti = async (req, res) => {
  try {
    const nuevaNoti = await NotiModel.create(req.body);
    res.status(201).json(nuevaNoti);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "No se guardaron las notificaciones",
      detalle: error.message,
    });
  }
};

export const CrearNotificacionManual = async (req, res) => {
  try {
    const {
      tipo,
      titulo,
      texto,
      detalles = "",
      userIds = [],
      target = "usuarios",
      tandaId = null,
      metadata = {},
    } = req.body;

    if (!tipo || !titulo || !texto) {
      return res.status(400).json({
        mensaje: "tipo, titulo y texto son obligatorios",
      });
    }

    const destinatarios = await obtenerUsuariosObjetivo({
      userIds,
      target,
      tandaId,
    });

    const notificaciones = await crearNotificaciones({
      destinatarios,
      remitenteId: req.usuario?.id || null,
      tandaId,
      tipo,
      origen: "manual",
      titulo,
      texto,
      detalles,
      metadata,
    });

    res.status(201).json({
      mensaje: "Aviso manual creado correctamente",
      total: notificaciones.length,
      notificaciones,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "No se pudieron crear los avisos manuales",
      detalle: error.message,
    });
  }
};

export const ObtenerNoti = async (req, res) => {
  try {
    const filtros = {};

    if (req.query.usuarioId) {
      filtros.usuario = req.query.usuarioId;
    }

    if (req.query.tipo) {
      filtros.tipo = req.query.tipo;
    }

    const notificaciones = await NotiModel.find(filtros)
      .populate("usuario", "nombre correo")
      .populate("remitente", "nombre correo")
      .populate("tanda", "nombre")
      .sort({ createdAt: -1 });

    res.json(notificaciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "No se obtuvieron los datos de las notificaciones",
      detalle: error.message,
    });
  }
};

export const ObtenerNotificacionesUsuario = async (req, res) => {
  try {
    const notificaciones = await NotiModel.find({ usuario: req.params.userId })
      .sort({ createdAt: -1 });

    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudieron obtener las notificaciones del usuario",
      detalle: error.message,
    });
  }
};

export const MarcarNotiLeida = async (req, res) => {
  try {
    const notificacion = await NotiModel.findByIdAndUpdate(
      req.params.id,
      { leida: true },
      { new: true }
    );

    res.json(notificacion);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo actualizar la notificacion",
      detalle: error.message,
    });
  }
};

export const MarcarTodasLeidas = async (req, res) => {
  try {
    const { userId } = req.params;

    await NotiModel.updateMany(
      { usuario: userId, leida: false },
      { $set: { leida: true } }
    );

    res.json({
      mensaje: "Notificaciones marcadas como leidas",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudieron actualizar las notificaciones",
      detalle: error.message,
    });
  }
};

export const deleteNoti = async (req, res) => {
  try {
    const notificacion = await NotiModel.findById(req.params.id);

    if (!notificacion) {
      return res.status(404).json({
        mensaje: "Notificacion no encontrada",
      });
    }

    if (!puedeUsarNotificacion(req, notificacion.usuario)) {
      return res.status(403).json({
        mensaje: "No tienes permiso para eliminar esta notificacion",
      });
    }

    await NotiModel.findByIdAndDelete(req.params.id);

    res.json({
      mensaje: "Notificacion eliminada correctamente",
      id: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo eliminar la notificacion",
      detalle: error.message,
    });
  }
};

export const EliminarNotificacionesSeleccionadas = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ids = [] } = req.body;

    if (!puedeUsarNotificacion(req, userId)) {
      return res.status(403).json({
        mensaje: "No tienes permiso para eliminar estas notificaciones",
      });
    }

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({
        mensaje: "Debes enviar al menos una notificacion para eliminar",
      });
    }

    const resultado = await NotiModel.deleteMany({
      _id: { $in: ids },
      usuario: userId,
    });

    res.json({
      mensaje: "Notificaciones eliminadas correctamente",
      totalEliminadas: resultado.deletedCount || 0,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudieron eliminar las notificaciones seleccionadas",
      detalle: error.message,
    });
  }
};

export const putNoti = async (req, res) => {
  try {
    const actualizarNoti = await NotiModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(actualizarNoti);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo actualizar la notificacion",
      detalle: error.message,
    });
  }
};
