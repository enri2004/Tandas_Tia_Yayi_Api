import express from "express";
import {
  AceptarSolicitudAmistad,
  EliminarAmigo,
  EnviarSolicitudAmistad,
  ObtenerListaAmigos,
  ObtenerSolicitudesRecibidas,
  RechazarSolicitudAmistad,
  VerPerfilAmigo,
} from "../Controllers/Controllers_Amigos.js";
import { validarToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/solicitud/enviar", validarToken, EnviarSolicitudAmistad);
router.get("/solicitudes/:id", validarToken, ObtenerSolicitudesRecibidas);
router.post("/solicitud/aceptar", validarToken, AceptarSolicitudAmistad);
router.post("/solicitud/rechazar", validarToken, RechazarSolicitudAmistad);
router.get("/lista/:id", validarToken, ObtenerListaAmigos);
router.get("/perfil/:usuarioId/:amigoId", validarToken, VerPerfilAmigo);
router.delete("/eliminar", validarToken, EliminarAmigo);

export default router;
