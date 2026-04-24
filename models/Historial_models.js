import mongoose from "mongoose"; 

const HistotialSchame = new mongoose.Schema(
  {
    tanda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tandas",
      default: null,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    tipo: {
      type: String,
      required: true,
      trim: true,
    },
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
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

export default mongoose.model("Histo", HistotialSchame);
