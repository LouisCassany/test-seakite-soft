import { Buffer } from "buffer"
import { DataSchemas } from "./frame"

const enum_map = {
  0: "U8",
  1: "S8",
  2: "U16",
  3: "S16",
  4: "U32",
  5: "S32",
  6: "U64",
  7: "S64",
  8: "float",
} as const

const type_map = {
  U8: { size: 1, read: Buffer.prototype.readUInt8, write: Buffer.prototype.writeUInt8 },
  S8: { size: 1, read: Buffer.prototype.readInt8, write: Buffer.prototype.writeInt8 },
  U16: { size: 2, read: Buffer.prototype.readUInt16LE, write: Buffer.prototype.writeUInt16LE },
  S16: { size: 2, read: Buffer.prototype.readInt16LE, write: Buffer.prototype.writeInt16LE },
  U32: { size: 4, read: Buffer.prototype.readUInt32LE, write: Buffer.prototype.writeUInt32LE },
  S32: { size: 4, read: Buffer.prototype.readInt32LE, write: Buffer.prototype.writeInt32LE },
  U64: { size: 8, read: Buffer.prototype.readBigUInt64LE, write: Buffer.prototype.writeBigUInt64LE },
  S64: { size: 8, read: Buffer.prototype.readBigInt64LE, write: Buffer.prototype.writeBigInt64LE },
  float: { size: 4, read: Buffer.prototype.readFloatLE, write: Buffer.prototype.writeFloatLE },
} as const

/**
 * Decode a buffer with the provided data_schema
 * @param buffer - Buffer to decode
 * @param frame_templates - data_schema describing the buffer
 * @returns data
 */
function decode_buffer(buffer: Buffer) {
  const frame_templates = DataSchemas.getFrameTemplates()
  const frame_id = "0x" + buffer[1].toString(16).padStart(2, "0")

  const frame_template = frame_templates[frame_id]
  if (!frame_template) throw new Error(`No frame template for frame id ${frame_id} were found.`)

  const bufferLength = Buffer.alloc(2)
  bufferLength[0] = buffer[2]
  bufferLength[1] = buffer[3]

  const frameLength = bufferLength.readUInt16LE(0)
  if (frameLength !== frame_template.data_length) {
    throw new Error(`Buffer length mismatch for frame ${frame_id}: expected ${frame_template.data_length}, got ${frameLength}.`)
  }

  const data_received: any = {}

  // Skipping start/id/length/length bytes and stopping before checksum
  for (let i = 3; i < frame_template.templates.length - 1; i++) {
    const template = frame_template.templates[i]
    const data_type = template.type as keyof typeof type_map
    const data_name = template.var_name
    const data_position = template.position

    try {
      //@ts-expect-error
      data_received[data_name] = type_map[data_type].read.call(buffer, data_position)
    } catch (e: any) {
      throw new Error(`Frame ${frame_id}, var ${data_name}: ${e}`)
    }
  }
  if (frame_id === "0x55") {
    console.log(data_received)
  }
  return data_received
}

/**
 * Encode a buffer with the provided data_schema and data object
 * @param data - Object containing the data to encode
 * @param frame_id - frame ID e.g "0x01"
 * @param frame_templates - data_schema describing the buffer
 * @return - Encoded buffer
 */
function encode_buffer(data: { [key: string]: any }, frame_id: string) {
  frame_id = frame_id.toLowerCase()
  const frame_templates = DataSchemas.getFrameTemplates()

  const frame_template = frame_templates[frame_id]
  if (!frame_template) throw new Error(`No frame template for frame id ${frame_id} were found.`)

  const total_length = frame_template.data_length
  const buffer = Buffer.alloc(total_length + 5) // Assuming start/id/len/len/CS are one byte each

  // @ts-ignore - write start byte
  type_map[frame_template.templates[0].type].write.call(buffer, 0xff, frame_template.templates[0].position)
  //@ts-ignore - write id byte
  type_map[frame_template.templates[1].type].write.call(buffer, frame_id, frame_template.templates[1].position)
  //@ts-ignore - write first length byte
  type_map[frame_template.templates[2].type].write.call(buffer, total_length, frame_template.templates[2].position)

  // Iterate on the templates
  for (let i = 3; i < frame_template.templates.length - 1; i++) {
    const template = frame_template.templates[i]
    const data_type = template.type as keyof typeof type_map
    const data_name = template.var_name
    const data_position = template.position

    if (data[data_name] === undefined) {
      throw new Error(`Key "${data_name}" found in data_frame ${frame_id} but not in the argument object.`)
    } else {
      //@ts-expect-error
      type_map[data_type].write.call(buffer, data[data_name], data_position)
    }
  }

  const header_size = 4
  // Compute CS
  let sum = 0
  for (let i = header_size; i < buffer.length; i++) {
    sum += buffer[i]
  }

  const computed_CS = (0x100 - (sum & 0xff)) & 0xff

  //@ts-ignore - write CS
  type_map[frame_template.templates.at(-1).type].write.call(buffer, computed_CS, buffer.length - 1)

  return buffer
}

export { decode_buffer, encode_buffer, type_map, enum_map }
