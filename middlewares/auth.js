import jwt from "jsonwebtoken";

const JWT_SECRET = "123456789abc";

export const validarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        mensaje: "No hay token",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje: "Token inválido o vencido",
    });
  }
};

export const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== "admin") {
    return res.status(403).json({
      ok: false,
      mensaje: "Acceso denegado",
    });
  }

  next();
};