import mongoose from "mongoose";

const ReporteSchame = new mongoose.Schema({
   datos:String,
   numero:Number, 
})

export default mongoose.model("Reporte",ReporteSchame)