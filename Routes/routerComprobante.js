import express from "express";
import upload from "../middlewares/upload.js";
import {
  AprobarComprobante,
  CrearComprobante,
  EliminarComprobante,
  ObtenerComprobantes,
  RegistrarPago,
  RechazarComprobante,
  RevisarComprobante,
} from "../Controllers/Controllers_Comprobante.js";
import { validarToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", validarToken, ObtenerComprobantes);
router.post("/", validarToken, upload.single("comprobante"), CrearComprobante);
router.post("/pagar", validarToken, upload.single("comprobante"), RegistrarPago);
router.put("/aprobar/:id", validarToken, AprobarComprobante);
router.put("/rechazar/:id", validarToken, RechazarComprobante);
router.put("/:id/revisar", validarToken, RevisarComprobante);
router.delete("/:id", validarToken, EliminarComprobante);

export default router;
