export async function getUserSubscriptions(telegramId) {
  const baseUrl = process.env.REMNAWAVE_API_URL;
  const apiKey = process.env.REMNAWAVE_API_KEY;

  if (!baseUrl || !apiKey) {
    return { configured: false, subscriptions: [] };
  }

  const urlPath = baseUrl.endsWith('/') ? 'users' : '/users';
  const url = baseUrl + urlPath + `?telegramId=${String(telegramId)}`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
      "x-forwarded-for": "127.0.0.1",
      "x-forwarded-proto": "https",
    },
  });

  if (!response.ok) {
    throw new Error(`Remnawave API error: ${response.status}`);
  }

  const data = await response.json();
  const subscriptions = Array.isArray(data) ? data : data?.users ?? data?.data ?? [];

  return { configured: true, subscriptions };
}

/**
 * Создает инбаунд (ключ VPN) в ремнавейв панели
 * @param {string} email - Email пользователя (используется как название ключа и в свойстве email)
 * @param {Date} purchaseDate - Дата покупки (опционально)
 * @returns {Promise<{success: boolean, inboundId?: string, error?: string}>}
 */
export async function createInboundKey(email, purchaseDate = null) {
  const baseUrl = process.env.REMNAWAVE_API_URL;
  const apiKey = process.env.REMNAWAVE_API_KEY;

  console.log("DEBUG: REMNAWAVE_API_URL =", baseUrl ? baseUrl.substring(0, 30) + "..." : "NOT SET");
  console.log("DEBUG: REMNAWAVE_API_KEY =", apiKey ? apiKey.substring(0, 20) + "..." : "NOT SET");

  if (!baseUrl || !apiKey) {
    console.warn("Remnawave API не настроена (REMNAWAVE_API_URL или REMNAWAVE_API_KEY отсутствует)");
    return {
      success: false,
      error: "Remnawave API не настроена"
    };
  }

  try {
    // Правильное составление URL - добавляем path к baseUrl
    const urlPath = baseUrl.endsWith('/') ? 'inbounds' : '/inbounds';
    const url = baseUrl + urlPath;

    const clientId = generateUUID();
    const purchaseDateStr = purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString();

    const body = {
      // Название инбаунда на основе email
      name: `Key - ${email}`,
      // Свойство email для хранения информации о владельце
      email: email,
      // Дата покупки в описании или в отдельном поле
      desc: `Purchased: ${purchaseDateStr}`,
      // Стандартные параметры для Xray inbound (VLESS по умолчанию)
      protocol: "vless",
      // Параметры инбаунда
      settings: {
        clients: [
          {
            id: clientId,
            email: email,
            alterId: 0,
          }
        ],
        decryption: "none",
        fallbacks: []
      },
      // Метаданные покупки
      metadata: {
        email: email,
        purchaseDate: purchaseDateStr,
        clientId: clientId
      }
    };

    console.log(`Creating VPN key for ${email}. Remnawave URL: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-forwarded-for": "127.0.0.1",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        console.error("Response text:", errorText);
      }

      console.error(`Remnawave API error ${response.status}:`, errorData);
      return {
        success: false,
        error: `Ошибка создания ключа: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`
      };
    }

    const data = await response.json();
    const inboundId = data?.id || data?.inboundId || data?.uuid;

    console.log(`✓ VPN key created successfully for ${email}. Inbound ID: ${inboundId}`);

    return {
      success: true,
      inboundId: inboundId,
      data: data
    };
  } catch (error) {
    console.error("Error creating inbound key:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Генерирует UUID v4
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Обновляет информацию о ключе в ремнавейв панели (для обновления даты покупки и другой информации)
 * @param {string} inboundId - ID инбаунда для обновления
 * @param {Object} updates - Объект с обновлениями
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateInboundKey(inboundId, updates) {
  const baseUrl = process.env.REMNAWAVE_API_URL;
  const apiKey = process.env.REMNAWAVE_API_KEY;

  if (!baseUrl || !apiKey) {
    console.warn("Remnawave API не настроена");
    return {
      success: false,
      error: "Remnawave API не настроена"
    };
  }

  try {
    const urlPath = baseUrl.endsWith('/') ? `inbounds/${inboundId}` : `/inbounds/${inboundId}`;
    const url = baseUrl + urlPath;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-forwarded-for": "127.0.0.1",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Remnawave API error ${response.status}:`, errorText);
      return {
        success: false,
        error: `Ошибка обновления ключа: ${response.status}`
      };
    }

    console.log(`✓ VPN key ${inboundId} updated successfully`);
    return { success: true };
  } catch (error) {
    console.error("Error updating inbound key:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Получает информацию о ключе из ремнавейв панели
 * @param {string} inboundId - ID инбаунда
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getInboundKey(inboundId) {
  const baseUrl = process.env.REMNAWAVE_API_URL;
  const apiKey = process.env.REMNAWAVE_API_KEY;

  if (!baseUrl || !apiKey) {
    return {
      success: false,
      error: "Remnawave API не настроена"
    };
  }

  try {
    const urlPath = baseUrl.endsWith('/') ? `inbounds/${inboundId}` : `/inbounds/${inboundId}`;
    const url = baseUrl + urlPath;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
        "x-forwarded-for": "127.0.0.1",
        "x-forwarded-proto": "https",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Ошибка получения ключа: ${response.status}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error("Error getting inbound key:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Удаляет ключ из ремнавейв панели
 * @param {string} inboundId - ID инбаунда
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteInboundKey(inboundId) {
  const baseUrl = process.env.REMNAWAVE_API_URL;
  const apiKey = process.env.REMNAWAVE_API_KEY;

  if (!baseUrl || !apiKey) {
    return {
      success: false,
      error: "Remnawave API не настроена"
    };
  }

  try {
    const urlPath = baseUrl.endsWith('/') ? `inbounds/${inboundId}` : `/inbounds/${inboundId}`;
    const url = baseUrl + urlPath;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
        "x-forwarded-for": "127.0.0.1",
        "x-forwarded-proto": "https",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Ошибка удаления ключа: ${response.status}`
      };
    }

    console.log(`✓ VPN key ${inboundId} deleted successfully`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting inbound key:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
