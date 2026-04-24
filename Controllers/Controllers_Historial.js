import HistorialModel from "../models/Historial_models.js";

export const NuevoHistoria = async (req, res) => {
  try {
    const nuevaHistorial = await HistorialModel.create(req.body);
    res.status(201).json(nuevaHistorial);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "No se guardo el historial",
      detalle: error.message,
    });
  }
};

export const ObtenerHistorial = async (req, res) => {
  try {
    const filtros = {};

    if (req.query.tandaId) {
      filtros.tanda = req.query.tandaId;
    }

    if (req.query.usuarioId) {
      filtros.usuario = req.query.usuarioId;
    }

    const historial = await HistorialModel.find(filtros)
      .populate("tanda", "nombre")
      .populate("usuario", "nombre correo")
      .populate("actor", "nombre correo")
      .sort({ createdAt: -1 });

    res.json(historial);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "No se obtuvieron los datos del historial",
      detalle: error.message,
    });
  }
};

export const ObtenerHistorialPorTanda = async (req, res) => {
  try {
    const historial = await HistorialModel.find({ tanda: req.params.tandaId })
      .populate("usuario", "nombre correo")
      .populate("actor", "nombre correo")
      .sort({ createdAt: -1 });

    res.json(historial);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo obtener el historial de la tanda",
      detalle: error.message,
    });
  }
};

export const EliminarHistorial = async (req, res) => {
  try {
    const eliminado = await HistorialModel.findByIdAndDelete(req.params.id);
    res.json(eliminado);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo eliminar el historial",
      detalle: error.message,
    });
  }
};

export const ActualizarHistorial = async (req, res) => {
  try {
    const historialActualizado = await HistorialModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(historialActualizado);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se actualizo el historial",
      detalle: error.message,
    });
  }
};
