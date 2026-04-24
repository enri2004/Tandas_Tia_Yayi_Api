import express from "express";
import {ObtenerReportes, NuevoReporte, putReporte, deleteReporte} from "../Controllers/Controllers_Reporte.js"


const router = express.Router();

router.get("/", ObtenerReportes);
router.post("/NuevoReporte", NuevoReporte);
router.put("/:id", putReporte);
router.delete("/delete/:id", deleteReporte);

export default router;