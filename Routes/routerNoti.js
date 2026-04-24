import express from "express"
import {
  CrearNotificacionManual,
  deleteNoti,
  EliminarNotificacionesSeleccionadas,
  MarcarNotiLeida,
  MarcarTodasLeidas,
  NuevaNoti,
  ObtenerNoti,
  ObtenerNotificacionesUsuario,
  putNoti,
} from "../Controllers/Controllers_Noti.js"
import { soloAdmin, validarToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/NuevaNoti", NuevaNoti);
router.post("/manual", validarToken, soloAdmin, CrearNotificacionManual);
router.get("/",ObtenerNoti);
router.get("/usuario/:userId", ObtenerNotificacionesUsuario);
router.put("/:id/leer", MarcarNotiLeida);
router.put("/usuario/:userId/leer-todas", MarcarTodasLeidas);
router.delete("/usuario/:userId/seleccionadas", validarToken, EliminarNotificacionesSeleccionadas);
router.delete("/:id", validarToken, deleteNoti);
router.delete("/delete/:id", validarToken, deleteNoti)
router.put("/:id", putNoti)


export default router;
