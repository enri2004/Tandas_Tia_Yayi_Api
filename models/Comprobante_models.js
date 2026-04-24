import mongoose from "mongoose";

const ComprobanteSchema = new mongoose.Schema(
  {
    tanda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tandas",
      required: true,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    monto: {
      type: Number,
      default: 0,
    },
    metodoPago: {
      type: String,
      enum: ["transferencia", "presencial"],
      default: "transferencia",
    },
    banco: {
      type: String,
      default: "",
    },
    clabe: {
      type: String,
      default: "",
    },
    referencia: {
      type: String,
      default: "",
    },
    personaRecibe: {
      type: String,
      default: "",
    },
    comprobanteUrl: {
      type: String,
      default: "",
    },
    public_id: {
      type: String,
      default: "",
    },
    estado: {
      type: String,
      enum: ["pendiente", "aprobado", "rechazado"],
      default: "pendiente",
    },
    observacionesAdmin: {
      type: String,
      default: "",
    },
    fechaRevision: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Comprobante", ComprobanteSchema);
