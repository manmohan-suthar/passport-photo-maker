async function readJsonBody(req: any) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = await readJsonBody(req);
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "No image provided" });
    }

    const matches = image.match(
      /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/,
    );
    if (!matches || matches.length < 3) {
      return res.status(400).json({
        error: "Invalid image format. Expected data URI with base64 data.",
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const imageBuffer = Buffer.from(base64Data, "base64");
    const maxClearBackdropBytes = 15 * 1024 * 1024;

    if (imageBuffer.byteLength > maxClearBackdropBytes) {
      return res.status(413).json({
        error: "Image is too large for online background removal",
        details:
          "The cropped image exceeds ClearBackdrop's 15MB upload limit. Reduce crop size or image quality and try again.",
      });
    }

    const formData = new FormData();
    formData.append(
      "image",
      new Blob([imageBuffer], { type: mimeType }),
      `passport-photo.${extension}`,
    );

    const clearBackdropResponse = await fetch(
      "https://clearbackdrop.com/api/v1/remove-background",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!clearBackdropResponse.ok) {
      const errorText = await clearBackdropResponse.text().catch(() => "");
      return res.status(clearBackdropResponse.status).json({
        error: "ClearBackdrop background removal failed",
        details: errorText || clearBackdropResponse.statusText,
        quota: {
          limit: clearBackdropResponse.headers.get("X-RateLimit-Limit"),
          remaining: clearBackdropResponse.headers.get("X-RateLimit-Remaining"),
          reset: clearBackdropResponse.headers.get("X-RateLimit-Reset"),
        },
      });
    }

    const pngBuffer = Buffer.from(await clearBackdropResponse.arrayBuffer());
    return res.status(200).json({
      image: `data:image/png;base64,${pngBuffer.toString("base64")}`,
      cached: clearBackdropResponse.headers.get("X-Cache") === "HIT",
      quota: {
        limit: clearBackdropResponse.headers.get("X-RateLimit-Limit"),
        remaining: clearBackdropResponse.headers.get("X-RateLimit-Remaining"),
        reset: clearBackdropResponse.headers.get("X-RateLimit-Reset"),
      },
    });
  } catch (error: any) {
    console.error("Background removal function error:", error);
    return res.status(500).json({
      error: "Failed to remove image background",
      details: error?.message || String(error),
    });
  }
}
