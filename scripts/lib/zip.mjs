/**
 * Minimal, dependency-free ZIP writer (DEFLATE) used by the portable build.
 *
 * Why not shell out to `zip`/`Compress-Archive`? Those are not available with
 * the same name on every OS: GitHub's Windows runners have neither `zip` on the
 * PATH nor a `zip`-compatible `Compress-Archive -Path` argument order, so the
 * build broke on Windows. Writing the archive in Node keeps the same command
 * working on Windows, Linux and macOS.
 */
import { deflateRawSync } from "node:zlib";
import fs from "node:fs/promises";
import path from "node:path";

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// MS-DOS date/time (local time), as required by the ZIP header.
function dosDateTime(date = new Date()) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time: time & 0xffff, date: day & 0xffff };
}

async function collectEntries(root, relative = "") {
  const directory = path.join(root, relative);
  const entries = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const childRelative = relative ? path.join(relative, item.name) : item.name;
    if (item.isDirectory()) {
      entries.push(...(await collectEntries(root, childRelative)));
    } else if (item.isFile()) {
      entries.push(childRelative);
    }
  }
  return entries.sort();
}

/**
 * Zips a directory into `zipPath`. Entries are stored with forward slashes and
 * rooted at `root` so extraction yields the folder contents directly.
 */
export async function zipDirectory(root, zipPath) {
  const files = await collectEntries(root);
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const relative of files) {
    const name = Buffer.from(relative.split(path.sep).join("/"), "utf8");
    const data = await fs.readFile(path.join(root, relative));
    const compressed = deflateRawSync(data, { level: 9 });
    // Fall back to STORE when deflating does not help (tiny/again-incompressible files).
    const useDeflate = compressed.length < data.length;
    const payload = useDeflate ? compressed : data;
    const method = useDeflate ? 8 : 0;
    const checksum = crc32(data);
    const { time, date } = dosDateTime();

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 filenames
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, name, payload);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0); // central directory signature
    header.writeUInt16LE(20, 4); // version made by
    header.writeUInt16LE(20, 6); // version needed
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(date, 14);
    header.writeUInt32LE(checksum, 16);
    header.writeUInt32LE(payload.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt16LE(0, 30); // extra length
    header.writeUInt16LE(0, 32); // comment length
    header.writeUInt16LE(0, 34); // disk number
    header.writeUInt16LE(0, 36); // internal attributes
    header.writeUInt32LE(0, 38); // external attributes
    header.writeUInt32LE(offset, 42);

    central.push(header, name);
    offset += local.length + name.length + payload.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  await fs.writeFile(zipPath, Buffer.concat([...chunks, centralBuffer, end]));
  return { files: files.length, bytes: offset + centralBuffer.length + end.length };
}
