import express from "express";
import {
  ObtenerDatos,
  ObtenerTandaPorCodigo,
  ObtenerResumenDashboardAdmin,
  ObtenerResumenDashboardUsuario,
  ObtenerTandaPorId,
  ObtenerTandasPorAdmin,
  ObtenerTandasPorUsuario,
  NuevaTanda,
  UnirseATanda,
  UnirseATandaPorCodigo,
  putTanda,
  deleteTanda,
  FinalizarTanda,
  AsignarTurnosTanda,
} from "../Controllers/Controllers_Tandas.js";
import upload from "../middlewares/upload.js";
import { soloAdmin, validarToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", ObtenerDatos);
router.get("/admin/resumen/:adminId", validarToken, soloAdmin, ObtenerResumenDashboardAdmin);
router.get("/admin/:adminId", validarToken, soloAdmin, ObtenerTandasPorAdmin);
router.get("/dashboard/resumen/:userId", validarToken, ObtenerResumenDashboardUsuario);
router.get("/usuario/:userId", ObtenerTandasPorUsuario);
router.get("/codigo/:codigo", validarToken, ObtenerTandaPorCodigo);
router.get("/:id", ObtenerTandaPorId);

router.post("/nueva", validarToken, upload.single("imagen"), NuevaTanda);
router.put("/:id", validarToken, putTanda);
router.put("/:id/finalizar", validarToken, soloAdmin, FinalizarTanda);
router.put("/:id/turnos", validarToken, soloAdmin, AsignarTurnosTanda);
router.put("/:id/unirse", validarToken, UnirseATanda);
router.put("/codigo/:codigo/unirse", validarToken, UnirseATandaPorCodigo);
router.delete("/:id", validarToken, deleteTanda);

export default router;
