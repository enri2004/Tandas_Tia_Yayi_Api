import express from "express";
import upload from "../middlewares/upload.js";
import {
  CrearComprobante,
  EliminarComprobante,
  ObtenerComprobantes,
  RevisarComprobante,
} from "../Controllers/Controllers_Comprobante.js";

const router = express.Router();

router.get("/", ObtenerComprobantes);
router.post("/", upload.single("comprobante"), CrearComprobante);
router.put("/:id/revisar", RevisarComprobante);
router.delete("/:id", EliminarComprobante);

export default router;
