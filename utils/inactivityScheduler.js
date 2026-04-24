import NotiModel from "../models/Noti_models.js";
import UserModel from "../models/User_models.js";
import { crearNotificaciones } from "./notificationService.js";

const HOURS_INTERVAL = Number(process.env.INACTIVITY_CHECK_HOURS || 6);
const INACTIVITY_DAYS = Number(process.env.INACTIVITY_DAYS || 7);

const inicioDelDia = (fecha = new Date()) => {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
};

const revisarUsuariosInactivos = async () => {
  const limite = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
  const hoy = inicioDelDia();

  const usuarios = await UserModel.find({
    ultimoAcceso: { $lte: limite },
  });

  for (const usuario of usuarios) {
    const yaNotificado = await NotiModel.findOne({
      usuario: usuario._id,
      tipo: "usuario_inactivo",
      createdAt: { $gte: hoy },
    });

    if (yaNotificado) {
      continue;
    }

    await crearNotificaciones({
      destinatarios: [usuario],
      tipo: "usuario_inactivo",
      origen: "sistema",
      titulo: "Te extrañamos en Tanda",
      texto: `Han pasado ${INACTIVITY_DAYS} dias desde tu ultimo acceso.`,
      detalles: "Vuelve a entrar para revisar tus tandas, pagos y notificaciones.",
      metadata: {
        ultimoAcceso: usuario.ultimoAcceso,
      },
    });
  }
};

export const iniciarSchedulerInactividad = () => {
  revisarUsuariosInactivos().catch((error) => {
    console.error("Error revisando usuarios inactivos:", error.message);
  });

  setInterval(() => {
    revisarUsuariosInactivos().catch((error) => {
      console.error("Error revisando usuarios inactivos:", error.message);
    });
  }, HOURS_INTERVAL * 60 * 60 * 1000);
};
