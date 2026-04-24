import cloudinary from "../config/cloudinary.js";
import ComprobanteModel from "../models/Comprobante_models.js";
import TandasModel from "../models/Tandas_models.js";
import UserModel from "../models/User_models.js";
import { Cloudinary_Subir } from "../utils/cloudinary.js";
import { crearNotificacionYHistorial, crearHistorial } from "../utils/notificationService.js";

export const CrearComprobante = async (req, res) => {
  try {
    const {
      tandaId,
      usuarioId,
      monto,
      metodoPago = "transferencia",
      banco = "",
      clabe = "",
      referencia = "",
      personaRecibe = "",
    } = req.body;

    if (!tandaId || !usuarioId) {
      return res.status(400).json({
        mensaje: "tandaId y usuarioId son obligatorios",
      });
    }

    const tanda = await TandasModel.findById(tandaId).populate("creador", "nombre");
    if (!tanda) {
      return res.status(404).json({
        mensaje: "Tanda no encontrada",
      });
    }

    const usuario = await UserModel.findById(usuarioId).select("nombre");
    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    let comprobanteUrl = "";
    let public_id = "";

    if (req.file) {
      const archivo = await Cloudinary_Subir(req.file);
      comprobanteUrl = archivo.url;
      public_id = archivo.public_id;
    }

    const comprobante = await ComprobanteModel.create({
      tanda: tandaId,
      usuario: usuarioId,
      monto: Number(monto || 0),
      metodoPago,
      banco,
      clabe,
      referencia,
      personaRecibe,
      comprobanteUrl,
      public_id,
    });

    await crearNotificacionYHistorial({
      target: "admins",
      tandaId,
      usuarioId,
      actorId: usuarioId,
      tipo: "comprobante_enviado",
      origen: "evento",
      titulo: "Nuevo comprobante enviado",
      texto: `${usuario.nombre} envio un comprobante para la tanda ${tanda.nombre}.`,
      detalles: "Revisa y valida el pago desde el panel administrativo.",
      metadata: {
        comprobanteId: comprobante._id,
        estado: comprobante.estado,
      },
    });

    res.status(201).json({
      mensaje: "Comprobante guardado correctamente",
      comprobante,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "No se pudo guardar el comprobante",
      detalle: error.message,
    });
  }
};

export const ObtenerComprobantes = async (req, res) => {
  try {
    const filtros = {};

    if (req.query.tandaId) {
      filtros.tanda = req.query.tandaId;
    }

    if (req.query.usuarioId) {
      filtros.usuario = req.query.usuarioId;
    }

    if (req.query.estado) {
      filtros.estado = req.query.estado;
    }

    const comprobantes = await ComprobanteModel.find(filtros)
      .populate("tanda", "nombre")
      .populate("usuario", "nombre correo")
      .populate("admin", "nombre correo")
      .sort({ createdAt: -1 });

    res.json(comprobantes);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudieron obtener los comprobantes",
      detalle: error.message,
    });
  }
};

export const RevisarComprobante = async (req, res) => {
  try {
    const { estado, adminId, observacionesAdmin = "" } = req.body;

    if (!["aprobado", "rechazado"].includes(estado)) {
      return res.status(400).json({
        mensaje: "El estado debe ser aprobado o rechazado",
      });
    }

    const comprobante = await ComprobanteModel.findById(req.params.id)
      .populate("tanda", "nombre")
      .populate("usuario", "nombre correo");

    if (!comprobante) {
      return res.status(404).json({
        mensaje: "Comprobante no encontrado",
      });
    }

    comprobante.estado = estado;
    comprobante.admin = adminId || null;
    comprobante.observacionesAdmin = observacionesAdmin;
    comprobante.fechaRevision = new Date();
    await comprobante.save();

    if (estado === "aprobado") {
      await TandasModel.findByIdAndUpdate(comprobante.tanda._id, {
        $inc: { pagoRealizados: 1 },
      });
    }

    const tipo = estado === "aprobado" ? "comprobante_aprobado" : "comprobante_rechazado";
    const titulo =
      estado === "aprobado" ? "Tu comprobante fue aprobado" : "Tu comprobante fue rechazado";
    const texto =
      estado === "aprobado"
        ? `Tu comprobante de ${comprobante.tanda.nombre} fue aprobado correctamente.`
        : `Tu comprobante de ${comprobante.tanda.nombre} fue rechazado.`;

    await crearNotificacionYHistorial({
      userIds: [comprobante.usuario._id],
      tandaId: comprobante.tanda._id,
      usuarioId: comprobante.usuario._id,
      actorId: adminId || null,
      tipo,
      origen: "evento",
      titulo,
      texto,
      detalles:
        observacionesAdmin ||
        (estado === "aprobado"
          ? "El pago ya se reflejo en el historial de la tanda."
          : "Revisa el motivo y vuelve a subir tu comprobante."),
      metadata: {
        comprobanteId: comprobante._id,
        estado,
      },
    });

    res.json({
      mensaje: `Comprobante ${estado} correctamente`,
      comprobante,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo revisar el comprobante",
      detalle: error.message,
    });
  }
};

export const EliminarComprobante = async (req, res) => {
  try {
    const comprobante = await ComprobanteModel.findById(req.params.id);

    if (!comprobante) {
      return res.status(404).json({
        mensaje: "Comprobante no encontrado",
      });
    }

    if (comprobante.public_id) {
      await cloudinary.uploader.destroy(comprobante.public_id);
    }

    await ComprobanteModel.findByIdAndDelete(req.params.id);

    await crearHistorial({
      tandaId: comprobante.tanda,
      usuarioId: comprobante.usuario,
      actorId: req.usuario?.id || null,
      tipo: "comprobante_eliminado",
      titulo: "Comprobante eliminado",
      descripcion: "Se elimino un comprobante del sistema.",
      metadata: {
        comprobanteId: comprobante._id,
      },
    });

    res.json({
      mensaje: "Comprobante eliminado correctamente",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo eliminar el comprobante",
      detalle: error.message,
    });
  }
};
