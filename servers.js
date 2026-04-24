import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import router from "./Routes/routerTandas.js";
import routerHistorial from "./Routes/routerHistorial.js";
import routerNoti from "./Routes/routerNoti.js";
import routerUser from "./Routes/routerUser.js";
import routerReporte from "./Routes/routerReporte.js";
import routerComprobante from "./Routes/routerComprobante.js";
import routerAmigos from "./Routes/routerAmigos.js";
import { iniciarSchedulerInactividad } from "./utils/inactivityScheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

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
console.log("ENV:", process.env.MONGO_URI);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB conectado");
    iniciarSchedulerInactividad();

    app.listen(PORT, () => {
      console.log(`Servidor levantado en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error al conectar MongoDB:", err);
  });

//mongodb+srv://molinahernandezenrijose_db_user:tvV6ZaPDPJYlEP7u@cluster0.xxaucnw.mongodb.net/?appName=Cluster0
//npm install mongodb
