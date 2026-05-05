import mongoose from "mongoose";

const TandasSchema = new mongoose.Schema(
  {
    nombre: String,
    pago: Number,
    montoPago: {
      type: Number,
      required: true,
    },
    participantes: Number,
    fecha: String,
    fechaInicio: {
      type: Date,
      required: true,
    },
    frecuencia: {
      type: String,
      enum: ["semanal", "quincenal", "mensual"],
      required: true,
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
    calendarioPagos: [
      {
        numeroPago: {
          type: Number,
        },
        fechaPago: {
          type: Date,
        },
        monto: {
          type: Number,
          default: 0,
        },
        estado: {
          type: String,
          enum: ["pendiente", "pagado", "vencido"],
          default: "pendiente",
        },
        usuariosPagaron: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        usuariosPendientes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
    claveInterbancaria: {
      type: String,
      default: "",
      trim: true,
    },
    nombreBeneficiario: {
      type: String,
      default: "",
      trim: true,
    },
    banco: {
      type: String,
      default: "",
      trim: true,
    },
    conceptoPago: {
      type: String,
      default: "",
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
    turnosCobro: [
      {
        numeroTurno: {
          type: Number,
          required: true,
        },
        usuarioId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        fechaCobro: {
          type: Date,
        },
        montoARecibir: {
          type: Number,
          default: 0,
        },
        estado: {
          type: String,
          enum: ["pendiente", "entregado"],
          default: "pendiente",
        },
        fechaEntrega: {
          type: Date,
          default: null,
        },
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
