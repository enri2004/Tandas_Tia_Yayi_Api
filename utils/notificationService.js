import HistorialModel from "../models/Historial_models.js";
import NotiModel from "../models/Noti_models.js";
import TandasModel from "../models/Tandas_models.js";
import UserModel from "../models/User_models.js";
import { enviarPushNotification } from "./enviarPushNotification.js";

export const crearHistorial = async ({
  tandaId = null,
  usuarioId = null,
  actorId = null,
  tipo,
  titulo,
  descripcion,
  metadata = {},
}) => {
  return HistorialModel.create({
    tanda: tandaId,
    usuario: usuarioId,
    actor: actorId,
    tipo,
    titulo,
    descripcion,
    metadata,
  });
};

export const obtenerUsuariosObjetivo = async ({
  userIds,
  target = "usuarios",
  tandaId = null,
}) => {
  if (Array.isArray(userIds) && userIds.length > 0) {
    return UserModel.find({ _id: { $in: userIds } });
  }

  if (target === "admins") {
    return UserModel.find({ rol: "admin" });
  }

  if (target === "tanda_integrantes" && tandaId) {
    const tanda = await TandasModel.findById(tandaId).select("integrantes creador");
    if (!tanda) {
      return [];
    }

    const ids = [
      ...(tanda.integrantes || []).map((item) => item.toString()),
      tanda.creador?.toString(),
    ].filter(Boolean);

    return UserModel.find({ _id: { $in: [...new Set(ids)] } });
  }

  return UserModel.find();
};

export const crearNotificaciones = async ({
  destinatarios = [],
  remitenteId = null,
  tandaId = null,
  tipo,
  origen = "evento",
  titulo,
  texto,
  detalles = "",
  metadata = {},
  pushTitle,
  pushBody,
  pushData = {},
}) => {
  if (!destinatarios.length) {
    return [];
  }

  const documentos = destinatarios.map((usuario) => ({
    usuario: usuario._id,
    remitente: remitenteId,
    tanda: tandaId,
    tipo,
    origen,
    titulo,
    texto,
    detalles,
    metadata,
  }));

  const notificaciones = await NotiModel.insertMany(documentos);

  await Promise.all(
    notificaciones.map(async (notificacion, index) => {
      const usuario = destinatarios[index];
      const tokens = (usuario.expoPushTokens || [])
        .map((item) =>
          typeof item === "string" ? item : item?.token || ""
        )
        .filter(Boolean);

      const push = await enviarPushNotification({
        tokens,
        title: pushTitle || titulo,
        body: pushBody || texto,
        data: {
          notificacionId: notificacion._id.toString(),
          tipo,
          ...pushData,
        },
      });

      notificacion.pushEnviado = push.ok && push.enviados > 0;
      notificacion.pushError = push.ok ? "" : push.error || "No se pudo enviar el push";
      await notificacion.save();
    })
  );

  return notificaciones;
};

export const crearNotificacionYHistorial = async ({
  userIds,
  target,
  tandaId = null,
  usuarioId = null,
  actorId = null,
  tipo,
  origen = "evento",
  titulo,
  texto,
  detalles = "",
  metadata = {},
  pushTitle,
  pushBody,
  pushData = {},
}) => {
  const destinatarios = await obtenerUsuariosObjetivo({ userIds, target, tandaId });

  const historial = await crearHistorial({
    tandaId,
    usuarioId,
    actorId,
    tipo,
    titulo,
    descripcion: texto,
    metadata,
  });

  const notificaciones = await crearNotificaciones({
    destinatarios,
    remitenteId: actorId,
    tandaId,
    tipo,
    origen,
    titulo,
    texto,
    detalles,
    metadata: {
      ...metadata,
      historialId: historial._id,
    },
    pushData: {
      tandaId,
      historialId: historial._id.toString(),
      ...pushData,
    },
    pushTitle,
    pushBody,
  });

  return { historial, notificaciones };
};
