import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import router from "./Routes/routerTandas.js";
import routerHistorial from "./Routes/routerHistorial.js";
import routerNoti from "./Routes/routerNoti.js";
import routerUser from "./Routes/routerUser.js";
import routerReporte from "./Routes/routerReporte.js";
import routerComprobante from "./Routes/routerComprobante.js";
import routerAmigos from "./Routes/routerAmigos.js";
import { iniciarSchedulerInactividad } from "./utils/inactivityScheduler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/Tandas", router);
app.use("/Historial", routerHistorial);
app.use("/Noti", routerNoti);
app.use("/User", routerUser);
app.use("/usuarios", routerUser);
app.use("/Reporte", routerReporte);
app.use("/Comprobante", routerComprobante);
app.use("/Amigos", routerAmigos);
app.use("/amigos", routerAmigos);

app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB conectado");
    iniciarSchedulerInactividad();
  })
  .catch((err) => {
    console.log("Error MongoDB:", err);
  });

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor levantado en puerto ${PORT}`);
});
//mongodb+srv://molinahernandezenrijose_db_user:tvV6ZaPDPJYlEP7u@cluster0.xxaucnw.mongodb.net/?appName=Cluster0
//npm install mongodb
