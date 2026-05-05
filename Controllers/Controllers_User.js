import { Cloudinary_Subir } from "../utils/imgCloud.js";
import UserModel from "../models/User_models.js";
import cloudinary from "../config/cloudinary.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "123456789abc";
const PERFIL_SELECT =
  "nombre edad correo usuario tipoUsuario rol imagen fotoPerfil proveedorAuth telefono direccion ultimoAcceso perfilActualizado mostrarModalActualizarDatos amigos solicitudesEnviadas solicitudesRecibidas createdAt updatedAt";

const obtenerFotoUsuario = (usuario) => usuario?.fotoPerfil || usuario?.imagen || "";

const obtenerPerfilActualizado = (usuario) =>
  typeof usuario?.perfilActualizado === "boolean"
    ? usuario.perfilActualizado
    : Boolean(
        usuario?.telefono ||
          usuario?.direccion ||
          usuario?.fotoPerfil ||
          usuario?.imagen
      );

const obtenerMostrarModalActualizarDatos = (usuario) =>
  typeof usuario?.mostrarModalActualizarDatos === "boolean"
    ? usuario.mostrarModalActualizarDatos
    : !obtenerPerfilActualizado(usuario);

const normalizarBooleano = (valor) => {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "string") {
    const normalizado = valor.trim().toLowerCase();
    if (normalizado === "true") return true;
    if (normalizado === "false") return false;
  }

  return undefined;
};

const construirPerfilUsuario = (usuario) => ({
  id: usuario._id,
  nombre: usuario.nombre,
  edad: usuario.edad,
  correo: usuario.correo,
  usuario: usuario.usuario,
  tipoUsuario: usuario.tipoUsuario,
  rol: usuario.rol,
  imagen: obtenerFotoUsuario(usuario),
  fotoPerfil: obtenerFotoUsuario(usuario),
  proveedorAuth: usuario.proveedorAuth || "local",
  telefono: usuario.telefono,
  direccion: usuario.direccion,
  ultimoAcceso: usuario.ultimoAcceso,
  perfilActualizado: obtenerPerfilActualizado(usuario),
  mostrarModalActualizarDatos: obtenerMostrarModalActualizarDatos(usuario),
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

const construirRespuestaAutenticacion = (usuario, mensaje) => ({
  ok: true,
  mensaje,
  token: jwt.sign(
    {
      id: usuario._id,
      rol: usuario.rol,
      correo: usuario.correo,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  ),
  usuario: construirPerfilUsuario(usuario),
});

const generarUsernameBase = ({ correo = "", nombre = "" }) => {
  const baseCorreo = correo.split("@")[0] || "";
  const baseNombre = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  return (baseCorreo || baseNombre || "usuario").slice(0, 18);
};

const generarUsernameDisponible = async ({ correo = "", nombre = "" }) => {
  const base = generarUsernameBase({ correo, nombre }) || "usuario";
  let candidato = base;
  let contador = 1;

  while (await UserModel.findOne({ usuario: candidato }).select("_id")) {
    contador += 1;
    candidato = `${base}${contador}`.slice(0, 24);
  }

  return candidato;
};

// Crear usuario
export const NuevoUser = async (req, res) => {
  try {
    let imagen = "";
    let public_id = "";

    const datos = req.body;
    const nombre = datos.nombre?.toString().trim() || "";
    const edadRaw = datos.edad;
    const correo = datos.correo?.toString().trim().toLowerCase() || "";
    const usuario = datos.usuario?.toString().trim() || "";
    const password = datos.password?.toString() || "";
    const telefono = datos.telefono?.toString().trim() || "";
    const direccion = datos.direccion?.toString().trim() || "";
    const tipoUsuario = datos.tipoUsuario?.toString().trim() || "";
    const rol = datos.rol?.toString().trim() || "usuario";
    const edad =
      edadRaw === undefined || edadRaw === null || edadRaw === ""
        ? null
        : Number(edadRaw);

    if (!nombre || !correo || !usuario || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: "Nombre, correo, usuario y contraseña son obligatorios",
      });
    }

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formatoCorreo.test(correo)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El formato del correo no es válido",
      });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({
        ok: false,
        mensaje: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    if (edad !== null && Number.isNaN(edad)) {
      return res.status(400).json({
        ok: false,
        mensaje: "La edad debe ser un número válido",
      });
    }

    if (tipoUsuario && !["crear", "unirse"].includes(tipoUsuario)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El tipo de usuario no es válido",
      });
    }

    if (!["admin", "usuario"].includes(rol)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El rol no es válido",
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
      edad,
      correo,
      usuario,
      password: passwordHash,
      telefono,
      direccion,
      tipoUsuario,
      rol,
      imagen,
      fotoPerfil: imagen,
      proveedorAuth: "local",
      public_id,
      perfilActualizado: false,
      mostrarModalActualizarDatos: true,
    });

    await nuevoUsuario.save();

    res.status(201).json(
      construirRespuestaAutenticacion(nuevoUsuario, "Usuario guardado correctamente")
    );
  } catch (error) {
    console.error(error);

    if (error?.code === 11000) {
      const campoDuplicado = Object.keys(error.keyPattern || {})[0];
      const mensaje =
        campoDuplicado === "correo"
          ? "El correo ya está registrado"
          : campoDuplicado === "usuario"
          ? "El nombre de usuario ya existe"
          : "Ya existe un registro con esos datos";

      return res.status(400).json({
        ok: false,
        mensaje,
      });
    }

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
        imagen: obtenerFotoUsuario(usuarioEncontrado),
        fotoPerfil: obtenerFotoUsuario(usuarioEncontrado),
        perfilActualizado: obtenerPerfilActualizado(usuarioEncontrado),
        mostrarModalActualizarDatos: obtenerMostrarModalActualizarDatos(usuarioEncontrado),
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

export const AuthSocialUser = async (req, res) => {
  try {
    const {
      nombre = "",
      correo = "",
      fotoPerfil = "",
      proveedorAuth = "",
    } = req.body;

    const nombreNormalizado = nombre.toString().trim();
    const correoNormalizado = correo.toString().trim().toLowerCase();
    const proveedor = proveedorAuth.toString().trim().toLowerCase();

    if (!nombreNormalizado || !correoNormalizado || !proveedor) {
      return res.status(400).json({
        ok: false,
        mensaje: "nombre, correo y proveedorAuth son obligatorios",
      });
    }

    if (!["google", "facebook"].includes(proveedor)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El proveedorAuth no es válido",
      });
    }

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formatoCorreo.test(correoNormalizado)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El formato del correo no es válido",
      });
    }

    let usuario = await UserModel.findOne({ correo: correoNormalizado });
    let mensaje = "Inicio de sesión social correcto";

    if (!usuario) {
      const passwordTemporal = crypto.randomBytes(24).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const usernameDisponible = await generarUsernameDisponible({
        correo: correoNormalizado,
        nombre: nombreNormalizado,
      });

      usuario = await UserModel.create({
        nombre: nombreNormalizado,
        correo: correoNormalizado,
        usuario: usernameDisponible,
        password: await bcrypt.hash(passwordTemporal, salt),
        proveedorAuth: proveedor,
        fotoPerfil: fotoPerfil?.toString?.().trim?.() || "",
        imagen: fotoPerfil?.toString?.().trim?.() || "",
        edad: null,
        direccion: "",
        telefono: "",
        rol: null,
        tipoUsuario: "",
        perfilActualizado: false,
        mostrarModalActualizarDatos: true,
        expoPushTokens: [],
      });

      mensaje = "Usuario social creado correctamente";
    } else {
      usuario.nombre = nombreNormalizado || usuario.nombre;
      usuario.proveedorAuth = proveedor;

      const fotoProveedor = fotoPerfil?.toString?.().trim?.() || "";
      if (fotoProveedor) {
        usuario.fotoPerfil = fotoProveedor;
        usuario.imagen = fotoProveedor;
      }

      await usuario.save();
    }

    usuario.ultimoAcceso = new Date();
    await usuario.save();

    res.status(200).json(
      construirRespuestaAutenticacion(usuario, mensaje)
    );
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "No se pudo autenticar al usuario con red social",
      detalle: error.message,
    });
  }
};

export const ActualizarRolUsuario = async (req, res) => {
  try {
    const authId = req.usuario?.id;
    const { rol } = req.body;

    if (!authId) {
      return res.status(401).json({
        ok: false,
        mensaje: "No hay un usuario autenticado",
      });
    }

    if (!["admin", "user", "usuario"].includes(rol)) {
      return res.status(400).json({
        ok: false,
        mensaje: "El rol enviado no es válido",
      });
    }

    const rolNormalizado = rol === "admin" ? "admin" : "usuario";
    const tipoUsuario = rolNormalizado === "admin" ? "crear" : "unirse";
    const usuario = await UserModel.findById(authId);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    usuario.rol = rolNormalizado;
    usuario.tipoUsuario = tipoUsuario;
    await usuario.save();

    res.status(200).json(
      construirRespuestaAutenticacion(usuario, "Rol actualizado correctamente")
    );
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "No se pudo actualizar el rol",
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

export const ObtenerUsuarioActual = async (req, res) => {
  try {
    const authId = req.usuario?.id;

    if (!authId) {
      return res.status(401).json({
        ok: false,
        mensaje: "No hay un usuario autenticado",
      });
    }

    const usuario = await UserModel.findById(authId).select(PERFIL_SELECT);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      usuario: construirPerfilUsuario(usuario),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo obtener la sesión actual",
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
      perfilActualizado,
      mostrarModalActualizarDatos,
    } = req.body;

    if (correo && correo !== usuario.correo) {
      const correoExistente = await UserModel.findOne({
        correo,
        _id: { $ne: id },
      });

      if (correoExistente) {
        return res.status(400).json({
          ok: false,
          mensaje: "El correo ya está registrado",
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
      usuario.fotoPerfil = resultado.url;
      usuario.public_id = resultado.public_id;
    }

    if (typeof nombre === "string") usuario.nombre = nombre.trim();
    if (edad !== undefined) usuario.edad = edad === "" ? null : Number(edad);
    if (typeof correo === "string") usuario.correo = correo.trim();
    if (typeof nombreUsuario === "string") usuario.usuario = nombreUsuario.trim();
    if (typeof telefono === "string") usuario.telefono = telefono.trim();
    if (typeof direccion === "string") usuario.direccion = direccion.trim();
    if (typeof tipoUsuario === "string") usuario.tipoUsuario = tipoUsuario;

    const perfilActualizadoNormalizado = normalizarBooleano(perfilActualizado);
    const mostrarModalNormalizado = normalizarBooleano(mostrarModalActualizarDatos);

    if (typeof perfilActualizadoNormalizado === "boolean") {
      usuario.perfilActualizado = perfilActualizadoNormalizado;
    }

    if (typeof mostrarModalNormalizado === "boolean") {
      usuario.mostrarModalActualizarDatos = mostrarModalNormalizado;
    }

    const huboCambiosPerfil =
      Boolean(req.file) ||
      nombre !== undefined ||
      edad !== undefined ||
      correo !== undefined ||
      nombreUsuario !== undefined ||
      telefono !== undefined ||
      direccion !== undefined ||
      tipoUsuario !== undefined;

    if (huboCambiosPerfil) {
      usuario.perfilActualizado = true;
      usuario.mostrarModalActualizarDatos = false;
    }

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
        mensaje: "Búsqueda realizada correctamente",
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
      mensaje: "Búsqueda realizada correctamente",
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
    const { expoPushToken } = req.body;
    const authId = req.user?.id || req.usuario?.id || req.user?._id;

    console.log("[Push][Backend] Usuario autenticado:", authId || "SIN_USUARIO");
    console.log("[Push][Backend] Token recibido:", expoPushToken || "VACIO");

    if (!expoPushToken) {
      return res.status(400).json({
        mensaje: "expoPushToken es obligatorio",
      });
    }

    if (!authId) {
      return res.status(401).json({
        mensaje: "No hay un usuario autenticado",
      });
    }

    const usuarioAntes = await UserModel.findById(authId).select("expoPushTokens");
    console.log("[Push][Backend] Tokens antes:", usuarioAntes?.expoPushTokens || []);

    const usuario = await UserModel.findByIdAndUpdate(
      authId,
      {
        $addToSet: { expoPushTokens: expoPushToken },
      },
      { new: true }
    ).select("-password");

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    console.log("[Push][Backend] Tokens despues:", usuario.expoPushTokens || []);

    res.json({
      mensaje: "Push token guardado correctamente",
      expoPushTokens: usuario.expoPushTokens,
      totalTokens: usuario.expoPushTokens.length,
      usuario,
    });
  } catch (error) {
    console.error("[Push][Backend] Error guardando push token:", error);
    res.status(500).json({
      mensaje: "Error guardando push token",
      error: error.message,
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
        mensaje: "El formato del correo no es válido",
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
        mensaje: "El correo ya está registrado",
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
      datos.fotoPerfil = resultado.url;
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

















