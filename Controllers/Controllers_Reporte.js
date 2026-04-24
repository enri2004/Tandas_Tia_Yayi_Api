import Reporte_models from "../models/Reporte_models.js";



export const NuevoReporte= async(req,res)=>{
    try{
        const nuevoReporte = new Reporte_models(req.body);
        await nuevoReporte.save();
        res.json(nuevoReporte);
    }catch(error){
        console.error(error);
        res.status(500).json("no se guardaron los reporte");
    }
}


export const ObtenerReportes = async (req,res)=>{
    try{
        const obtenerReportes =  await Reporte_models.find()
        res.json(obtenerReportes);
    }catch(error){
        res.status(500).json("no se obtuvieron los datos")

    }

}

export const putReporte = async(req,res)=>{
    try{
        const ActualizarReportes= await Reporte_models.findByIdAndUpdate(req.params.id)
        res.json(ActualizarReportes);
    }catch(error){
        res.status(500).json("No se actualizaron los reportes")
    }
}

export const deleteReporte= async (req,res)=>{
    try{
        const EliminarReportes = await Reporte_models.findByIdAndDelete(req.params.id);
        res.json(EliminarReportes);
    }catch(error){
        res.status(500).json("no se eliminaron los reportes")
    }
}