import mongoose from "mongoose";
import UserModel from "../models/User_models.js";
import { crearNotificacionYHistorial } from "../utils/notificationService.js";

const AMIGO_SELECT = "nombre edad correo usuario tipoUsuario rol imagen fotoPerfil telefono direccion ultimoAcceso";

const esObjectIdValido = (valor) => mongoose.Types.ObjectId.isValid(valor);

const idsIguales = (a, b) => a?.toString() === b?.toString();

const puedeUsarUsuario = (req, usuarioId) => {
  if (!req.usuario?.id) {
    return true;
  }

  return req.usuario.rol === "admin" || req.usuario.id.toString() === usuarioId.toString();
};

const perfilPublico = (usuario) => ({
  id: usuario._id,
  nombre: usuario.nombre,
  edad: usuario.edad,
  correo: usuario.correo,
  usuario: usuario.usuario,
  tipoUsuario: usuario.tipoUsuario,
  rol: usuario.rol,
  imagen: usuario.fotoPerfil || usuario.imagen,
  fotoPerfil: usuario.fotoPerfil || usuario.imagen,
  telefono: usuario.telefono,
  direccion: usuario.direccion,
  ultimoAcceso: usuario.ultimoAcceso,
});

const cargarUsuariosRelacion = async (...ids) => {
  return Promise.all(ids.map((id) => UserModel.findById(id)));
};

export const EnviarSolicitudAmistad = async (req, res) => {
  try {
    const { emisorId, receptorId } = req.body;

    if (!emisorId || !receptorId) {
      return res.status(400).json({
        ok: false,
        mensaje: "emisorId y receptorId son obligatorios",
      });
    }

    if (!puedeUsarUsuario(req, emisorId)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No puedes enviar solicitudes por otro usuario",
      });
    }

    if (!esObjectIdValido(emisorId) || !esObjectIdValido(receptorId)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Ids de usuario invalidos",
      });
    }

    if (idsIguales(emisorId, receptorId)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Un usuario no puede enviarse solicitud a si mismo",
      });
    }

    const [emisor, receptor] = await cargarUsuariosRelacion(emisorId, receptorId);

    if (!emisor || !receptor) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    if (emisor.amigos.some((id) => idsIguales(id, receptorId))) {
      return res.status(400).json({
        ok: false,
        mensaje: "Ya son amigos",
      });
    }

    if (emisor.solicitudesEnviadas.some((id) => idsIguales(id, receptorId))) {
      return res.status(400).json({
        ok: false,
        mensaje: "Solicitud ya existente",
      });
    }

    if (emisor.solicitudesRecibidas.some((id) => idsIguales(id, receptorId))) {
      return res.status(400).json({
        ok: false,
        mensaje: "Ya tienes una solicitud pendiente de este usuario",
      });
    }

    emisor.solicitudesEnviadas.addToSet(receptor._id);
    receptor.solicitudesRecibidas.addToSet(emisor._id);

    await Promise.all([emisor.save(), receptor.save()]);

    await crearNotificacionYHistorial({
      userIds: [receptor._id],
      usuarioId: receptor._id,
      actorId: emisor._id,
      tipo: "solicitud_amistad",
      origen: "evento",
      titulo: "Nueva solicitud de amistad",
      texto: `${emisor.nombre} te envio una solicitud de amistad.`,
      detalles: "Abre tus solicitudes para responder.",
      metadata: {
        solicitudId: `${emisor._id}-${receptor._id}`,
        usuarioId: emisor._id.toString(),
      },
      pushTitle: "Nueva solicitud de amistad",
      pushBody: `${emisor.nombre} te envio una solicitud de amistad.`,
      pushData: {
        tipo: "solicitud_amistad",
        solicitudId: `${emisor._id}-${receptor._id}`,
        usuarioId: emisor._id.toString(),
      },
    });

    res.status(200).json({
      ok: true,
      mensaje: "Solicitud enviada correctamente",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al enviar la solicitud de amistad",
      detalle: error.message,
    });
  }
};

export const ObtenerSolicitudesRecibidas = async (req, res) => {
  try {
    const { id } = req.params;

    if (!puedeUsarUsuario(req, id)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para ver estas solicitudes",
      });
    }

    const usuario = await UserModel.findById(id)
      .populate("solicitudesRecibidas", AMIGO_SELECT)
      .select("solicitudesRecibidas");

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: "Solicitudes obtenidas correctamente",
      solicitudes: (usuario.solicitudesRecibidas || []).map(perfilPublico),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener solicitudes",
      detalle: error.message,
    });
  }
};

export const AceptarSolicitudAmistad = async (req, res) => {
  try {
    const { usuarioId, solicitanteId } = req.body;

    if (!usuarioId || !solicitanteId) {
      return res.status(400).json({
        ok: false,
        mensaje: "usuarioId y solicitanteId son obligatorios",
      });
    }

    if (!puedeUsarUsuario(req, usuarioId)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No puedes aceptar solicitudes por otro usuario",
      });
    }

    const [usuario, solicitante] = await cargarUsuariosRelacion(usuarioId, solicitanteId);

    if (!usuario || !solicitante) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const solicitudExistente = usuario.solicitudesRecibidas.some((id) => idsIguales(id, solicitanteId));

    if (!solicitudExistente) {
      return res.status(400).json({
        ok: false,
        mensaje: "No existe una solicitud pendiente de este usuario",
      });
    }

    usuario.amigos.addToSet(solicitante._id);
    solicitante.amigos.addToSet(usuario._id);

    usuario.solicitudesRecibidas = usuario.solicitudesRecibidas.filter(
      (id) => !idsIguales(id, solicitanteId)
    );
    solicitante.solicitudesEnviadas = solicitante.solicitudesEnviadas.filter(
      (id) => !idsIguales(id, usuarioId)
    );

    await Promise.all([usuario.save(), solicitante.save()]);

    await crearNotificacionYHistorial({
      userIds: [solicitante._id],
      usuarioId: solicitante._id,
      actorId: usuario._id,
      tipo: "respuesta_amistad",
      origen: "evento",
      titulo: "Solicitud aceptada",
      texto: `${usuario.nombre} acepto tu solicitud de amistad.`,
      detalles: "Ya pueden verse en la seccion de amigos.",
      metadata: {
        solicitudId: `${solicitante._id}-${usuario._id}`,
        estado: "aceptado",
      },
      pushTitle: "Solicitud aceptada",
      pushBody: `${usuario.nombre} acepto tu solicitud de amistad.`,
      pushData: {
        tipo: "respuesta_amistad",
        solicitudId: `${solicitante._id}-${usuario._id}`,
        estado: "aceptado",
      },
    });

    res.status(200).json({
      ok: true,
      mensaje: "Solicitud aceptada correctamente",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al aceptar la solicitud",
      detalle: error.message,
    });
  }
};

export const RechazarSolicitudAmistad = async (req, res) => {
  try {
    const { usuarioId, solicitanteId } = req.body;

    if (!usuarioId || !solicitanteId) {
      return res.status(400).json({
        ok: false,
        mensaje: "usuarioId y solicitanteId son obligatorios",
      });
    }

    if (!puedeUsarUsuario(req, usuarioId)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No puedes rechazar solicitudes por otro usuario",
      });
    }

    const [usuario, solicitante] = await cargarUsuariosRelacion(usuarioId, solicitanteId);

    if (!usuario || !solicitante) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    usuario.solicitudesRecibidas = usuario.solicitudesRecibidas.filter(
      (id) => !idsIguales(id, solicitanteId)
    );
    solicitante.solicitudesEnviadas = solicitante.solicitudesEnviadas.filter(
      (id) => !idsIguales(id, usuarioId)
    );

    await Promise.all([usuario.save(), solicitante.save()]);

    await crearNotificacionYHistorial({
      userIds: [solicitante._id],
      usuarioId: solicitante._id,
      actorId: usuario._id,
      tipo: "respuesta_amistad",
      origen: "evento",
      titulo: "Solicitud rechazada",
      texto: `${usuario.nombre} rechazo tu solicitud de amistad.`,
      detalles: "Puedes intentar de nuevo mas adelante.",
      metadata: {
        solicitudId: `${solicitante._id}-${usuario._id}`,
        estado: "rechazado",
      },
      pushTitle: "Solicitud rechazada",
      pushBody: `${usuario.nombre} rechazo tu solicitud de amistad.`,
      pushData: {
        tipo: "respuesta_amistad",
        solicitudId: `${solicitante._id}-${usuario._id}`,
        estado: "rechazado",
      },
    });

    res.status(200).json({
      ok: true,
      mensaje: "Solicitud rechazada correctamente",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al rechazar la solicitud",
      detalle: error.message,
    });
  }
};

export const ObtenerListaAmigos = async (req, res) => {
  try {
    const { id } = req.params;

    if (!puedeUsarUsuario(req, id)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para ver esta lista de amigos",
      });
    }

    const usuario = await UserModel.findById(id)
      .populate("amigos", AMIGO_SELECT)
      .select("amigos");

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: "Lista de amigos obtenida correctamente",
      amigos: (usuario.amigos || []).map(perfilPublico),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener la lista de amigos",
      detalle: error.message,
    });
  }
};

export const VerPerfilAmigo = async (req, res) => {
  try {
    const { usuarioId, amigoId } = req.params;
    const esAdmin = req.usuario?.rol === "admin";

    if (!puedeUsarUsuario(req, usuarioId)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para ver este perfil",
      });
    }

    const [usuario, amigo] = await Promise.all([
      UserModel.findById(usuarioId).select("amigos"),
      UserModel.findById(amigoId).select(`${AMIGO_SELECT} amigos`),
    ]);

    if (!usuario || !amigo) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const sonAmigos = usuario.amigos.some((id) => idsIguales(id, amigoId));

    if (!esAdmin && !sonAmigos) {
      return res.status(403).json({
        ok: false,
        mensaje: "Solo puedes ver el perfil de un amigo si ambos son amigos",
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: "Perfil de amigo obtenido correctamente",
      amigo: {
        ...perfilPublico(amigo),
        totalAmigos: Array.isArray(amigo.amigos) ? amigo.amigos.length : 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener el perfil del amigo",
      detalle: error.message,
    });
  }
};

export const EliminarAmigo = async (req, res) => {
  try {
    const { usuarioId, amigoId } = req.body;

    if (!usuarioId || !amigoId) {
      return res.status(400).json({
        ok: false,
        mensaje: "usuarioId y amigoId son obligatorios",
      });
    }

    if (!puedeUsarUsuario(req, usuarioId)) {
      return res.status(403).json({
        ok: false,
        mensaje: "No puedes eliminar amigos por otro usuario",
      });
    }

    const [usuario, amigo] = await cargarUsuariosRelacion(usuarioId, amigoId);

    if (!usuario || !amigo) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    usuario.amigos = usuario.amigos.filter((id) => !idsIguales(id, amigoId));
    amigo.amigos = amigo.amigos.filter((id) => !idsIguales(id, usuarioId));

    await Promise.all([usuario.save(), amigo.save()]);

    res.status(200).json({
      ok: true,
      mensaje: "Amigo eliminado correctamente",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al eliminar al amigo",
      detalle: error.message,
    });
  }
};
