const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

const esExpoPushTokenValido = (token = "") =>
  typeof token === "string" && token.startsWith("ExponentPushToken[");

export const enviarPushNotification = async ({
  tokens = [],
  title,
  body,
  data = {},
}) => {
  const tokensValidos = [...new Set(tokens.filter(esExpoPushTokenValido))];

  if (!tokensValidos.length) {
    return {
      ok: true,
      enviados: 0,
      tickets: [],
      error: "",
    };
  }

  const mensajes = tokensValidos.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mensajes),
    });

    const resultado = await response.json();
    console.log("Expo push response:", JSON.stringify(resultado));

    return {
      ok: response.ok,
      enviados: tokensValidos.length,
      tickets: resultado?.data || [],
      error: response.ok ? "" : JSON.stringify(resultado),
    };
  } catch (error) {
    console.error("Error enviando push notification:", error);

    return {
      ok: false,
      enviados: 0,
      tickets: [],
      error: error?.message || "No se pudo enviar la notificacion push",
    };
  }
};
