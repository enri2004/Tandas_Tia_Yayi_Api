import { Cloudinary_Subir } from "../utils/cloudinary.js";
import UserModel from "../models/User_models.js";
import cloudinary from "../config/cloudinary.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = "123456789abc";
const PERFIL_SELECT =
  "nombre edad correo usuario tipoUsuario rol imagen telefono direccion ultimoAcceso amigos solicitudesEnviadas solicitudesRecibidas createdAt updatedAt";

const construirPerfilUsuario = (usuario) => ({
  id: usuario._id,
  nombre: usuario.nombre,
  edad: usuario.edad,
  correo: usuario.correo,
  usuario: usuario.usuario,
  tipoUsuario: usuario.tipoUsuario,
  rol: usuario.rol,
  imagen: usuario.imagen,
  telefono: usuario.telefono,
  direccion: usuario.direccion,
  ultimoAcceso: usuario.ultimoAcceso,
  totalAmigos: Array.isArray(usuario.amigos) ? usuario.amigos.length : 0,
  totalSolicitudesEnviadas: Array.isArray(usuario.solicitudesEnviadas)
    ? usuario.solicitudesEnviadas.length
    : 0,
  totalSolicitudesRecibidas: Array.isArray(usuario.solicitudesRecibidas)
    ? usuario.solicitudesRecibidas.length
    : 0,
  createdAt: usuario.createdAt,
  updatedAt: usuario.updatedAt,
});

// Crear usuario
export const NuevoUser = async (req, res) => {
  try {
    let imagen = "";
    let public_id = "";

    const {
      nombre,
      edad,
      correo,
      usuario,
      password,
      telefono,
      direccion,
      tipoUsuario,
      rol,
    } = req.body;

    if (!nombre || !correo || !usuario || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: "Nombre, correo, usuario y contraseña son obligatorios",
      });
    }

    const existeCorreo = await UserModel.findOne({ correo });
    if (existeCorreo) {
      return res.status(400).json({
        ok: false,
        mensaje: "El correo ya está registrado",
      });
    }

    const existeUsuario = await UserModel.findOne({ usuario });
    if (existeUsuario) {
      return res.status(400).json({
        ok: false,
        mensaje: "El nombre de usuario ya existe",
      });
    }

    if (req.file) {
      const result = await Cloudinary_Subir(req.file);
      imagen = result.url;
      public_id = result.public_id;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = new UserModel({
      nombre,
      edad: edad || null,
      correo,
      usuario,
      password: passwordHash,
      telefono: telefono || "",
      direccion: direccion || "",
      tipoUsuario: tipoUsuario || "",
      rol: rol || "usuario",
      imagen,
      public_id,
    });

    await nuevoUsuario.save();

    res.status(201).json({
      ok: true,
      mensaje: "Usuario guardado correctamente",
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        usuario: nuevoUsuario.usuario,
        rol: nuevoUsuario.rol,
        tipoUsuario: nuevoUsuario.tipoUsuario,
        imagen: nuevoUsuario.imagen,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      mensaje: "No se guardaron los datos del usuario",
      detalle: error.message,
    });
  }
};

// Login
export const LoginUser = async (req, res) => {
  try {
    const { correo, password } = req.body;
    console.log(correo, password)
    if (!correo || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: "Correo y contraseña son obligatorios",
      });
    }

     const usuarioEncontrado = await UserModel.findOne({
      $or: [
        { correo: correo.toLowerCase() },
        { usuario: correo }
      ],
    });
    console.log(usuarioEncontrado)
    if (!usuarioEncontrado) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const passwordCorrecta = await bcrypt.compare(
      password,
      usuarioEncontrado.password
    );

    if (!passwordCorrecta) {
      return res.status(401).json({
        ok: false,
        mensaje: "Contraseña incorrecta",
      });
    }

    const token = jwt.sign(
      {
        id: usuarioEncontrado._id,
        rol: usuarioEncontrado.rol,
        correo: usuarioEncontrado.correo,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    usuarioEncontrado.ultimoAcceso = new Date();
    await usuarioEncontrado.save();

    res.status(200).json({
      ok: true,
      mensaje: "Inicio de sesión correcto",
      token,
      usuario: {
        id: usuarioEncontrado._id,
        nombre: usuarioEncontrado.nombre,
        correo: usuarioEncontrado.correo,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol,
        tipoUsuario: usuarioEncontrado.tipoUsuario,
        imagen: usuarioEncontrado.imagen,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      mensaje: "Error al iniciar sesión",
      detalle: error.message,
    });
  }
};

// Obtener todos
export const ObtenerUsuario = async (req, res) => {
  try {
    const usuarios = await UserModel.find().sort({ createdAt: -1 });
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudieron obtener los datos",
      detalle: error.message,
    });
  }
};

// Obtener por id
export const ObtenerUsuarioPorId = async (req, res) => {
  try {
    const usuario = await UserModel.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener el usuario",
      detalle: error.message,
    });
  }
};

export const ObtenerPerfilUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (authId && authRol !== "admin" && authId.toString() !== id.toString()) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para ver este perfil",
      });
    }

    const usuario = await UserModel.findById(id).select(PERFIL_SELECT);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: "Perfil obtenido correctamente",
      perfil: construirPerfilUsuario(usuario),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al obtener el perfil",
      detalle: error.message,
    });
  }
};

export const ActualizarPerfilUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;

    if (authId && authRol !== "admin" && authId.toString() !== id.toString()) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para actualizar este perfil",
      });
    }

    const usuario = await UserModel.findById(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const {
      nombre,
      edad,
      correo,
      usuario: nombreUsuario,
      telefono,
      direccion,
      tipoUsuario,
    } = req.body;

    if (correo && correo !== usuario.correo) {
      const correoExistente = await UserModel.findOne({
        correo,
        _id: { $ne: id },
      });

      if (correoExistente) {
        return res.status(400).json({
          ok: false,
          mensaje: "El correo ya esta registrado",
        });
      }
    }

    if (nombreUsuario && nombreUsuario !== usuario.usuario) {
      const usuarioExistente = await UserModel.findOne({
        usuario: nombreUsuario,
        _id: { $ne: id },
      });

      if (usuarioExistente) {
        return res.status(400).json({
          ok: false,
          mensaje: "El nombre de usuario ya existe",
        });
      }
    }

    if (req.file) {
      if (usuario.public_id) {
        await cloudinary.uploader.destroy(usuario.public_id);
      }

      const resultado = await Cloudinary_Subir(req.file);
      usuario.imagen = resultado.url;
      usuario.public_id = resultado.public_id;
    }

    if (typeof nombre === "string") usuario.nombre = nombre.trim();
    if (edad !== undefined) usuario.edad = edad === "" ? null : Number(edad);
    if (typeof correo === "string") usuario.correo = correo.trim();
    if (typeof nombreUsuario === "string") usuario.usuario = nombreUsuario.trim();
    if (typeof telefono === "string") usuario.telefono = telefono.trim();
    if (typeof direccion === "string") usuario.direccion = direccion.trim();
    if (typeof tipoUsuario === "string") usuario.tipoUsuario = tipoUsuario;

    await usuario.save();

    res.status(200).json({
      ok: true,
      mensaje: "Perfil actualizado correctamente",
      perfil: construirPerfilUsuario(usuario),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "No se pudo actualizar el perfil",
      detalle: error.message,
    });
  }
};

export const BuscarUsuarios = async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const currentUserId = (req.query.currentUserId || req.usuario?.id || "")
      .toString()
      .trim();

    if (!q) {
      return res.status(200).json({
        ok: true,
        mensaje: "Busqueda realizada correctamente",
        usuarios: [],
      });
    }

    const currentUser = currentUserId
      ? await UserModel.findById(currentUserId).select(
          "amigos solicitudesEnviadas solicitudesRecibidas"
        )
      : null;

    const criterio = {
      $or: [
        { nombre: { $regex: q, $options: "i" } },
        { usuario: { $regex: q, $options: "i" } },
      ],
    };

    if (currentUserId) {
      criterio._id = { $ne: currentUserId };
    }

    const usuarios = await UserModel.find(criterio)
      .select("nombre correo usuario imagen tipoUsuario rol")
      .limit(25)
      .sort({ nombre: 1 });

    const amigosIds = new Set(
      (currentUser?.amigos || []).map((item) => item.toString())
    );
    const enviadosIds = new Set(
      (currentUser?.solicitudesEnviadas || []).map((item) => item.toString())
    );
    const recibidosIds = new Set(
      (currentUser?.solicitudesRecibidas || []).map((item) => item.toString())
    );

    res.status(200).json({
      ok: true,
      mensaje: "Busqueda realizada correctamente",
      usuarios: usuarios.map((item) => ({
        id: item._id,
        nombre: item.nombre,
        correo: item.correo,
        usuario: item.usuario,
        imagen: item.imagen,
        tipoUsuario: item.tipoUsuario,
        rol: item.rol,
        esAmigo: amigosIds.has(item._id.toString()),
        solicitudEnviada: enviadosIds.has(item._id.toString()),
        solicitudRecibida: recibidosIds.has(item._id.toString()),
      })),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error al buscar usuarios",
      detalle: error.message,
    });
  }
};

export const GuardarPushToken = async (req, res) => {
  try {
    const { expoPushToken, platform = "" } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({
        mensaje: "expoPushToken es obligatorio",
      });
    }

    const usuario = await UserModel.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    const existente = usuario.expoPushTokens.find(
      (item) => item.token === expoPushToken
    );

    if (existente) {
      existente.activo = true;
      existente.platform = platform || existente.platform;
      existente.lastRegisteredAt = new Date();
    } else {
      usuario.expoPushTokens.push({
        token: expoPushToken,
        platform,
        activo: true,
        lastRegisteredAt: new Date(),
      });
    }

    await usuario.save();

    res.json({
      mensaje: "ExpoPushToken guardado correctamente",
      totalTokens: usuario.expoPushTokens.length,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo guardar el token push",
      detalle: error.message,
    });
  }
};

export const ActualizarCorreoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;
    const { correo } = req.body;

    if (authId && authRol !== "admin" && authId.toString() !== id.toString()) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para actualizar este correo",
      });
    }

    if (!correo || !correo.toString().trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: "El nuevo correo es obligatorio",
      });
    }

    const correoNormalizado = correo.toString().trim().toLowerCase();
    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoCorreo.test(correoNormalizado)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El formato del correo no es valido",
      });
    }

    const usuario = await UserModel.findById(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const correoExistente = await UserModel.findOne({
      correo: correoNormalizado,
      _id: { $ne: id },
    });

    if (correoExistente) {
      return res.status(400).json({
        ok: false,
        mensaje: "El correo ya esta registrado",
      });
    }

    usuario.correo = correoNormalizado;
    await usuario.save();

    res.status(200).json({
      ok: true,
      mensaje: "Correo actualizado correctamente",
      perfil: construirPerfilUsuario(usuario),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "No se pudo actualizar el correo",
      detalle: error.message,
    });
  }
};

export const ActualizarPasswordUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const authId = req.usuario?.id;
    const authRol = req.usuario?.rol;
    const { passwordActual, nuevaPassword, confirmarPassword } = req.body;

    if (authId && authRol !== "admin" && authId.toString() !== id.toString()) {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permiso para actualizar esta contrasena",
      });
    }

    if (!passwordActual || !nuevaPassword || !confirmarPassword) {
      return res.status(400).json({
        ok: false,
        mensaje: "Todos los campos son obligatorios",
      });
    }

    if (nuevaPassword !== confirmarPassword) {
      return res.status(400).json({
        ok: false,
        mensaje: "La confirmacion de contrasena no coincide",
      });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        mensaje: "La nueva contrasena debe tener al menos 6 caracteres",
      });
    }

    const usuario = await UserModel.findById(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const passwordCorrecta = await bcrypt.compare(passwordActual, usuario.password);

    if (!passwordCorrecta) {
      return res.status(400).json({
        ok: false,
        mensaje: "La contrasena actual es incorrecta",
      });
    }

    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(nuevaPassword, salt);
    await usuario.save();

    res.status(200).json({
      ok: true,
      mensaje: "Contrasena actualizada correctamente",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "No se pudo actualizar la contrasena",
      detalle: error.message,
    });
  }
};

export const ActualizarUltimoAcceso = async (req, res) => {
  try {
    const usuario = await UserModel.findByIdAndUpdate(
      req.params.id,
      {
        ultimoAcceso: new Date(),
      },
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    res.json({
      mensaje: "Ultimo acceso actualizado",
      ultimoAcceso: usuario.ultimoAcceso,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo actualizar el ultimo acceso",
      detalle: error.message,
    });
  }
};

// Eliminar
export const Eliminar = async (req, res) => {
  try {
    const usuarioEliminado = await UserModel.findById(req.params.id);

    if (!usuarioEliminado) {
      return res.status(404).json({
        mensaje: "No se encuentra el usuario",
      });
    }

    if (usuarioEliminado.public_id) {
      await cloudinary.uploader.destroy(usuarioEliminado.public_id);
    }

    await UserModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      mensaje: "Usuario eliminado correctamente",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se eliminó al usuario",
      detalle: error.message,
    });
  }
};

// Actualizar
export const Actualizar = async (req, res) => {
  try {
    let datos = { ...req.body };

    const usuario = await UserModel.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    if (req.file) {
      if (usuario.public_id) {
        await cloudinary.uploader.destroy(usuario.public_id);
      }

      const resultado = await Cloudinary_Subir(req.file);
      datos.imagen = resultado.url;
      datos.public_id = resultado.public_id;
    }

    if (datos.password) {
      const salt = await bcrypt.genSalt(10);
      datos.password = await bcrypt.hash(datos.password, salt);
    }

    const usuarioActualizado = await UserModel.findByIdAndUpdate(
      req.params.id,
      datos,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      mensaje: "Usuario actualizado correctamente",
      usuario: usuarioActualizado,
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudieron actualizar los datos",
      detalle: error.message,
    });
  }
};
