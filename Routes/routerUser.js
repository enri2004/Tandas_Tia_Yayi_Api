import express from "express";
import {
  Actualizar,
  ActualizarPerfilUsuario,
  ActualizarCorreoUsuario,
  ActualizarUltimoAcceso,
  ActualizarPasswordUsuario,
  BuscarUsuarios,
  Eliminar,
  GuardarPushToken,
  LoginUser,
  NuevoUser,
  ObtenerPerfilUsuario,
  ObtenerUsuario,
  ObtenerUsuarioPorId,
} from "../Controllers/Controllers_User.js"
import upload from "../middlewares/upload.js"
import { validarToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/NuevoUser", upload.single("imagen"),NuevoUser);
router.post("/login", LoginUser);
router.get("/",ObtenerUsuario);
router.get("/buscar", validarToken, BuscarUsuarios);
router.post("/push-token", validarToken, GuardarPushToken);
router.get("/perfil/:id", validarToken, ObtenerPerfilUsuario);
router.get("/:id", ObtenerUsuarioPorId);
router.put("/perfil/:id", validarToken, upload.single("imagen"), ActualizarPerfilUsuario);
router.put("/perfil/:id/correo", validarToken, ActualizarCorreoUsuario);
router.put("/perfil/:id/password", validarToken, ActualizarPasswordUsuario);
router.put("/:id/ultimo-acceso", ActualizarUltimoAcceso);
router.delete("/delete/:id", Eliminar);
router.put("/:id",upload.single("imagen"),Actualizar)


export default router;
