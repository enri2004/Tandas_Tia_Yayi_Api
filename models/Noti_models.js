import mongoose from "mongoose";

const TIPOS_NOTIFICACION = [
  "comprobante_enviado",
  "comprobante_aprobado",
  "comprobante_rechazado",
  "pago_proximo",
  "pago_vencido",
  "turno_cercano",
  "tanda_terminada",
  "integrante_agregado",
  "mantenimiento",
  "actualizacion_app",
  "aviso_general",
  "mensaje_admin",
  "usuario_inactivo",
  "notificaciones_sin_leer",
  "pago_pendiente",
];

const NotiSchame = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remitente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    tanda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tandas",
      default: null,
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    texto: {
      type: String,
      required: true,
      trim: true,
    },
    detalles: {
      type: String,
      default: "",
      trim: true,
    },
    tipo: {
      type: String,
      enum: TIPOS_NOTIFICACION,
      required: true,
    },
    origen: {
      type: String,
      enum: ["evento", "manual", "sistema"],
      default: "evento",
    },
    leida: {
      type: Boolean,
      default: false,
    },
    pushEnviado: {
      type: Boolean,
      default: false,
    },
    pushError: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export { TIPOS_NOTIFICACION };

export default mongoose.model("Noti", NotiSchame);
