(function () {
  const CRC32_TABLE = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    CRC32_TABLE[index] = value >>> 0;
  }

  function calculateCrc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function createUint16(value) {
    const bytes = new Uint8Array(2);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, value, true);
    return bytes;
  }

  function createUint32(value) {
    const bytes = new Uint8Array(4);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, value >>> 0, true);
    return bytes;
  }

  function getDosDateTime(date) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime =
      ((date.getHours() & 0x1f) << 11) |
      ((date.getMinutes() & 0x3f) << 5) |
      Math.floor(date.getSeconds() / 2);
    const dosDate =
      (((year - 1980) & 0x7f) << 9) |
      (((date.getMonth() + 1) & 0x0f) << 5) |
      (date.getDate() & 0x1f);

    return { dosTime, dosDate };
  }

  window.createStoredZip = function createStoredZip(entries) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    entries.forEach((entry) => {
      const fileNameBytes = encoder.encode(entry.name);
      const fileBytes =
        entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
      const crc32 = calculateCrc32(fileBytes);
      const { dosTime, dosDate } = getDosDateTime(entry.lastModified || new Date());

      const localHeader = [
        createUint32(0x04034b50),
        createUint16(20),
        createUint16(0x0800),
        createUint16(0),
        createUint16(dosTime),
        createUint16(dosDate),
        createUint32(crc32),
        createUint32(fileBytes.length),
        createUint32(fileBytes.length),
        createUint16(fileNameBytes.length),
        createUint16(0),
        fileNameBytes,
      ];

      localParts.push(...localHeader, fileBytes);

      const centralHeader = [
        createUint32(0x02014b50),
        createUint16(20),
        createUint16(20),
        createUint16(0x0800),
        createUint16(0),
        createUint16(dosTime),
        createUint16(dosDate),
        createUint32(crc32),
        createUint32(fileBytes.length),
        createUint32(fileBytes.length),
        createUint16(fileNameBytes.length),
        createUint16(0),
        createUint16(0),
        createUint16(0),
        createUint16(0),
        createUint32(0),
        createUint32(offset),
        fileNameBytes,
      ];

      centralParts.push(...centralHeader);

      offset += localHeader.reduce((total, part) => total + part.length, 0) + fileBytes.length;
    });

    const centralDirectorySize = centralParts.reduce((total, part) => total + part.length, 0);
    const endRecord = [
      createUint32(0x06054b50),
      createUint16(0),
      createUint16(0),
      createUint16(entries.length),
      createUint16(entries.length),
      createUint32(centralDirectorySize),
      createUint32(offset),
      createUint16(0),
    ];

    return new Blob([...localParts, ...centralParts, ...endRecord], {
      type: "application/zip",
    });
  };
})();
