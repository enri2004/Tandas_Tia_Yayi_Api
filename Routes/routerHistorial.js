import express from "express"
import {
  ActualizarHistorial,
  EliminarHistorial,
  NuevoHistoria,
  ObtenerHistorial,
  ObtenerHistorialPorTanda,
} from "../Controllers/Controllers_Historial.js"


const router = express.Router();

router.post("/NuevaHistorial",NuevoHistoria)
router.get("/", ObtenerHistorial)
router.get("/tanda/:tandaId", ObtenerHistorialPorTanda)
router.delete("/delete/:id",EliminarHistorial)
router.put("/:id",ActualizarHistorial)

export default router;
