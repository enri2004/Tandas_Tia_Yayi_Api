import express from "express";
import upload from "../middlewares/upload.js";
import {
  CrearComprobante,
  EliminarComprobante,
  ObtenerComprobantes,
  RevisarComprobante,
} from "../Controllers/Controllers_Comprobante.js";
import { validarToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", validarToken, ObtenerComprobantes);
router.post("/", validarToken, upload.single("comprobante"), CrearComprobante);
router.put("/:id/revisar", validarToken, RevisarComprobante);
router.delete("/:id", validarToken, EliminarComprobante);

export default router;
