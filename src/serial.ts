
class Serial {
    buffer = new Uint8Array(1024)
    w_pos = 0
    private r_pos = 0
    private header_size = 4
    private start_byte = 0xff
    private length_buffer = new Uint8Array(2)
    private frame_length = 0
    private state: "PRE" | "ID" | "LEN" | "DATA" | "CS" = "PRE"
    private frame_id: number | null = null
    private port: any

    onConnect: (status: boolean) => void = () => { }

    async write(data: Uint8Array) {
        if (this.port && this.port.writable) {
            const writer = this.port.writable.getWriter();
            await writer.write(data).then(() => {
                writer.releaseLock();
            }).catch((error: any) => {
                console.error('Write error:', error);
            });
        } else {
            console.error('Port is not writable or not open');
        }
    }

    async getPorts() {
        //@ts-ignore
        const ports = await navigator.serial.getPorts()
        if (ports.length > 0) {
            // Filter port where usbProductId is 0x374E or usbVendorId is 0x0483 by calling port.getInfo()
            const port = ports.find((port: any) => port.getInfo().usbProductId === 0x374E || port.getInfo().usbVendorId === 0x0483)
            if (port) {
                this.openPort(port);
            } else {
                console.log("No suitable port found, waiting for user to connect one")
            }
        } else {
            console.log("No port already available, waiting for user to connect one")
        }
    }

    async openPort(port: any) {
        try {
            this.onConnect(true);
            await port.open({ baudRate: 230400 });
            this.port = port;
            while (port.readable) {
                const reader = port.readable.getReader();
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            console.log('Reader done');
                            break;
                        }

                        if (value) {
                            // value is a Uint8Array — read byte by byte
                            for (const byte of value) {
                                SerialProcess.processData(byte)
                            }
                        }
                    }
                } catch (error) {
                    console.error('Read error:', error);
                } finally {
                    reader.releaseLock();
                }
            }
        } catch (err) {
            console.error('Serial error:', err);
            this.onConnect(false);
            this.port = null;
        }
    }

    onFrameReceived: (frame: Uint8Array) => void = () => { }

    processData(byte: number) {
        this.buffer[this.w_pos] = byte
        this.w_pos++
        while (this.r_pos < this.w_pos) {
            this.processByte()
            this.r_pos++
        }
    }

    processByte() {
        const byte = this.buffer[this.r_pos]

        if (this.state == "PRE") {
            if (byte == this.start_byte) {
                this.state = "ID"
                return
            }
        }

        if (this.state == "ID") {
            this.frame_id = byte
            this.state = "LEN"
            return
        }

        if (this.state == "LEN") {
            if (this.r_pos == 2) {
                this.length_buffer[0] = byte
                return
            } else if (this.r_pos == 3) {
                this.length_buffer[1] = byte
                this.frame_length = new DataView(this.length_buffer.buffer).getUint16(0, true)
                if (this.frame_length > 1024) {
                    this.state = "PRE"
                    return
                }
                this.state = "DATA"
                return
            }
        }

        if (this.state == "DATA") {
            if (this.r_pos - (this.header_size - 1) == this.frame_length) {
                this.state = "CS"
                return
            }
            if (this.r_pos - (this.header_size - 1) < this.frame_length) return
        }

        if (this.state == "CS") {
            let cs = 0
            for (let i = this.header_size; i < this.r_pos + 1; i++) {
                cs += this.buffer[i]
            }
            if (cs % 256 == 0) {
                const frame_buffer = new Uint8Array(this.frame_length + this.header_size + 1)
                frame_buffer.set(this.buffer.subarray(0, this.frame_length + this.header_size + 1), 0)
                this.onFrameReceived(frame_buffer);
            }
        }

        // Reset the state machine and shift the internal buffer
        this.state = "PRE"
        for (let i = 0; i < this.buffer.length - 1; i++) this.buffer[i] = this.buffer[i + 1]
        this.w_pos -= 1
        if (this.w_pos < 0) this.w_pos = 0
        this.r_pos = -1
        this.length_buffer = new Uint8Array(2)
        this.frame_id = null
    }
}

const SerialProcess = new Serial()
export { SerialProcess }
