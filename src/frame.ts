import { Buffer } from "buffer"
import { type_map, enum_map } from "./buffer"

type ParameterDetails = {
    name: string;
    default: number;
    id: number;
    category: string;
    min: number;
    max: number;
    unit: string;
    step: number;
    disabled: boolean;
    type: string;
    accessLevel: number;
    order: number;
}

const parseParamDetailsCsv = (csvContent: string): ParameterDetails[] => {
    const lines = csvContent.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())
    const result = [] as any[]

    const numberFields = ["min", "max", "default", "order", "step", "accessLevel"]
    const booleanFields = ["disabled"]

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((cell) => cell.trim())
        if (row.length !== headers.length) {
            throw new Error(`Malformed line ${i + 1}: wrong number of columns`)
        }

        const obj = {} as ParameterDetails

        for (let j = 0; j < headers.length; j++) {
            const key = headers[j]
            let value: string | number | boolean = row[j]

            if (value === "") throw new Error(`Empty value for column '${key}' at line ${i + 1}`)

            if (numberFields.includes(key)) {
                value = Number(value)
                if (isNaN(value)) throw new Error(`Invalid number for column '${key}' at line ${i + 1}`)
            } else if (booleanFields.includes(key)) value = value === "true" ? true : false
            else if (key === "frameId") value = value.toLowerCase()

            // @ts-ignore
            obj[key] = value
        }

        result.push(obj)
    }

    return result
}

function headerTemplates() {
    return [
        { var_name: "PRE", size: 1, position: 0, type: "U8" },
        { var_name: "ID", size: 1, position: 1, type: "U8" },
        { var_name: "LEN", size: 2, position: 2, type: "U16" },
    ]
}

const RAW_FRAME_TEMPLATES: Frame_template = {
    "0x50": {
        data_length: 2,
        templates: [
            ...headerTemplates(),
            { var_name: "frame_id", size: 1, position: 4, type: "U8" },
            { var_name: "error_code", size: 1, position: 5, type: "U8" },
            { var_name: "CS", size: 1, position: 6, type: "U8" },
        ],
    },
    "0x74": {
        data_length: 2,
        templates: [
            ...headerTemplates(),
            { var_name: "frame_id", size: 2, position: 4, type: "U16" },
            { var_name: "CS", size: 1, position: 6, type: "U8" },
        ],
    },
    "0x75": {
        data_length: 2,
        templates: [
            ...headerTemplates(),
            { var_name: "frame_id", size: 2, position: 4, type: "U16" },
            { var_name: "CS", size: 1, position: 6, type: "U8" },
        ],
    },
    "0xc9": {
        data_length: 1,
        templates: [
            ...headerTemplates(),
            { var_name: "IMU_command", size: 1, position: 4, type: "U8" },
            { var_name: "CS", size: 1, position: 5, type: "U8" },
        ],
    },
    "0xcb": {
        data_length: 1,
        templates: [
            ...headerTemplates(),
            { var_name: "FS_command", size: 1, position: 4, type: "U8" },
            { var_name: "CS", size: 1, position: 5, type: "U8" },
        ],
    },
    "0xcc": {
        data_length: 1,
        templates: [
            ...headerTemplates(),
            { var_name: "LineLenght_command", size: 1, position: 4, type: "U8" },
            { var_name: "CS", size: 1, position: 5, type: "U8" },
        ],
    },
    "0xcd": {
        data_length: 1,
        templates: [
            ...headerTemplates(),
            { var_name: "KitePos_command", size: 1, position: 4, type: "U8" },
            { var_name: "CS", size: 1, position: 5, type: "U8" },
        ],
    },
    "0xd2": {
        data_length: 58,
        templates: [
            ...headerTemplates(),
            { var_name: "commit_hash_0", size: 1, position: 4, type: "U8" },
            { var_name: "commit_hash_1", size: 1, position: 5, type: "U8" },
            { var_name: "commit_hash_2", size: 1, position: 6, type: "U8" },
            { var_name: "commit_hash_3", size: 1, position: 7, type: "U8" },
            { var_name: "commit_hash_4", size: 1, position: 8, type: "U8" },
            { var_name: "commit_hash_5", size: 1, position: 9, type: "U8" },
            { var_name: "commit_hash_6", size: 1, position: 10, type: "U8" },
            { var_name: "commit_hash_7", size: 1, position: 11, type: "U8" },
            { var_name: "uncommited_changes", size: 1, position: 12, type: "U8" },
            ...Array.from({ length: 50 }, (_, i) => ({ var_name: `branch_name_${i}`, size: 1, position: 13 + i, type: "U8" })),
            { var_name: "CS", size: 1, position: 63, type: "U8" },
        ],
    },
    "0xd3": {
        data_length: 4,
        templates: [
            ...headerTemplates(),
            { var_name: "adjustement", size: 4, position: 4, type: "float" },
            { var_name: "CS", size: 1, position: 8, type: "U8" },
        ],
    },
    "0xd4": {
        data_length: 4,
        templates: [
            ...headerTemplates(),
            { var_name: "total_manual_diff", size: 4, position: 4, type: "float" },
            { var_name: "CS", size: 1, position: 8, type: "U8" },
        ],
    },
    "0xd5": {
        data_length: 4,
        templates: [
            ...headerTemplates(),
            { var_name: "adjustement", size: 4, position: 4, type: "float" },
            { var_name: "CS", size: 1, position: 8, type: "U8" },
        ],
    },
    "0xd6": {
        data_length: 4,
        templates: [
            ...headerTemplates(),
            { var_name: "front_balance_offset", size: 4, position: 4, type: "float" },
            { var_name: "CS", size: 1, position: 8, type: "U8" },
        ],
    },
}

type template = {
    var_name: string
    size: number
    position: number
    type: string
}

type Frame_template = {
    [key: string]: {
        data_length: number
        templates: template[]
    }
}

class DataSchemas {
    frame_templates: Frame_template | undefined = undefined

    async start() {
        await this.loadDataSchemas()
        this.addRawTemplates()
    }

    getFrameTemplates() {
        if (this.frame_templates === undefined) {
            throw new Error("[CSV] Data schemas not loaded")
        }
        return this.frame_templates
    }

    buildFrameTemplate(payload: Buffer) {
        const bufferID = Buffer.alloc(2)
        bufferID[0] = payload[4]
        bufferID[1] = payload[5]
        const key = "0x" + bufferID.readUInt16LE(0).toString(16).toLocaleLowerCase()
        const new_buf = Uint8Array.prototype.slice.call(payload, 6, -1)
        const variables = [] as { varName: string; type: number }[]

        let i = 0
        while (i < new_buf.length) {
            const byte = new_buf[i]
            let str_end = i + 1
            while (str_end < new_buf.length && new_buf[str_end] !== 0x00) {
                str_end++
            }
            const str = new TextDecoder().decode(new_buf.slice(i + 1, str_end))
            i = str_end + 1

            variables.push({
                varName: str,
                type: byte,
            })
        }

        // Header
        const templates = headerTemplates()

        // Payload
        let data_length = 0
        for (const variable of variables) {
            const type = enum_map[variable.type as keyof typeof enum_map]
            templates.push({
                var_name: variable.varName,
                size: type_map[type as keyof typeof type_map].size,
                position: data_length + 4,
                type: type,
            })
            data_length += type_map[type as keyof typeof type_map].size
        }

        // CS
        templates.push({
            var_name: "CS",
            size: 1,
            position: data_length + 2,
            type: "U8",
        })

        this.frame_templates![key] = {
            data_length: data_length,
            templates: templates,
        }
    }

    /**
     * Load all frames templates in the provided folder.
     * The loaded templates are accessible through the getFrameTemplates() method.
     * @returns - Map containing all the frames templates identified by their ID in hex format
     */

    async loadDataSchemas() {
        const frame_templates: Frame_template = {}
        const res = await fetch('/paramDetailsSeeds.csv');
        const csvContent = await res.text();

        try {
            const parsedCsv = parseParamDetailsCsv(csvContent as string)

            const byFrame: { [frameId: string]: any[] } = {}

            // Group by frameId
            for (const line of parsedCsv) {
                //@ts-ignore
                const frameId = line.frameId
                if (!frameId) continue
                if (!byFrame[frameId]) byFrame[frameId] = []

                byFrame[frameId].push(line)
            }

            // Build frame templates
            for (const frameId in byFrame) {
                let position = 0
                const templates: template[] = []
                templates.push({ var_name: "preambule", size: 1, position: position++, type: "U8" })
                templates.push({ var_name: "ID", size: 1, position: position++, type: "U8" })
                templates.push({ var_name: "LEN", size: 2, position: position, type: "U16" })
                position += 2

                let data_length = 0
                for (const param of byFrame[frameId]) {
                    const type = (param.dataType || "").trim()
                    const size = type_map[type as keyof typeof type_map].size || 0

                    templates.push({
                        var_name: param.name,
                        size,
                        position,
                        type,
                    })

                    position += size
                    data_length += size
                }

                templates.push({ var_name: "CS", size: 1, position: position, type: "U8" })

                frame_templates[frameId] = {
                    data_length: data_length,
                    templates: templates,
                }
            }

            this.frame_templates = frame_templates
        } catch (e: any) {
            console.error("[CSV] Error loading data schemas:", e.message)
        }
    }

    addRawTemplates() {
        if (!this.frame_templates) this.frame_templates = {}
        for (const key in RAW_FRAME_TEMPLATES) {
            this.frame_templates[key] = RAW_FRAME_TEMPLATES[key]
        }
    }
}

const DataSchemasInstance = new DataSchemas()
export { DataSchemasInstance as DataSchemas }