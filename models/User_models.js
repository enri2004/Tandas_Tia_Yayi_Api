import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      default: "",
    },
    edad: {
      type: Number,
      default: null,
    },
    correo: {
      type: String,
      required: true,
      unique: true,
      default: "",
    },
    usuario: {
      type: String,
      required: true,
      unique: true,
      default: "",
    },
    password: {
      type: String,
      required: true,
      default: "",
    },
    tipoUsuario: {
      type: String,
      enum: ["crear", "unirse", ""],
      default: "",
    },
    rol: {
      type: String,
      enum: ["admin", "usuario"],
      default: "usuario",
    },
    imagen: {
      type: String,
      default: "",
    },
    fotoPerfil: {
      type: String,
      default: "",
    },
    public_id: {
      type: String,
      default: "",
    },
    telefono: {
      type: String,
      default: "",
    },
    direccion: {
      type: String,
      default: "",
    },
    ultimoAcceso: {
      type: Date,
      default: Date.now,
    },
    perfilActualizado: {
      type: Boolean,
      default: false,
    },
    mostrarModalActualizarDatos: {
      type: Boolean,
      default: true,
    },
    expoPushTokens: {
      type: [String],
      default: [],
    },
    amigos: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    solicitudesEnviadas: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    solicitudesRecibidas: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", UserSchema);
