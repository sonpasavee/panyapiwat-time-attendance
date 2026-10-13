export type CsvEncoding = "UTF-8" | "UTF-16LE" | "UTF-16BE" | "Windows-874";

export function decodeCsvBytes(buffer: ArrayBuffer): {
  text: string;
  encoding: CsvEncoding;
} {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3)),
      encoding: "UTF-8",
    };
  }

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      text: new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2)),
      encoding: "UTF-16LE",
    };
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return {
      text: new TextDecoder("utf-16be", { fatal: true }).decode(bytes.subarray(2)),
      encoding: "UTF-16BE",
    };
  }

  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      encoding: "UTF-8",
    };
  } catch {
    try {
      return {
        text: new TextDecoder("windows-874", { fatal: true }).decode(bytes),
        encoding: "Windows-874",
      };
    } catch {
      throw new Error("อ่าน encoding ของ CSV ไม่ได้ กรุณาบันทึกไฟล์เป็น UTF-8 แล้วลองใหม่");
    }
  }
}
