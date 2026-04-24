import mongoose from "mongoose";

const TandasSchema = new mongoose.Schema(
  {
    nombre: String,
    pago: Number,
    participantes: Number,
    fecha: String,
    frecuencia: {
      type: String,
      default: "quincenal",
      trim: true,
    },
    descripcion: {
      type: String,
      default: "",
      trim: true,
    },
    codigoInvitacion: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    pagoRealizados: Number,
    turno: Number,
    imagen: String,
    public_id: String,
    estado: Boolean,
    creador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    integrantes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    turnos: [
      {
        usuario: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        orden: {
          type: Number,
          required: true,
        },
        fechaProgramada: {
          type: String,
          required: true,
        },
        estadoPago: {
          type: String,
          enum: ["pendiente", "pagado"],
          default: "pendiente",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Tandas", TandasSchema);
